import {
    ButtonBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle,
    ActionRowBuilder,
    InteractionCollector,
    ComponentType,
    ButtonInteraction,
    CacheType,
    InteractionResponse // Added for typing response
} from "discord.js";
import { BlackjackUtils } from "../../utils/Blackjack/BlackjackUtils";
import UserInfo from "../../models/userInfo"; // Assuming Mongoose model
import { currencyFormatter } from "../../utils/CurrencyUtils"; // Assuming formatter utility
import { Card } from "../../utils/Blackjack/CardUtils";
// No direct EmojiUtils import needed here anymore

// Define game states
enum GameState {
    PLAYER_TURN = 'PLAYER_TURN',
    DEALER_TURN = 'DEALER_TURN',
    SPLIT_TURN = 'SPLIT_TURN', // Keep if more complex split logic is added later
    GAME_OVER = 'GAME_OVER'
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Start a game of Blackjack!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet (must be a positive number)')
                .setRequired(true)),
    async execute(interaction: CommandInteraction): Promise<void> {

        // --- 1. Initial Setup & Bet Validation ---
        let userInfo = await UserInfo.findOne({ uid: interaction.user.id });

        if (!userInfo) {
            try {
                 const newUser = new UserInfo({ uid: interaction.user.id, balance: 1000 });
                 await newUser.save();
                 userInfo = newUser;
                 // Inform user account was created, maybe ephemerally
                  await interaction.channel?.send({ content: `Welcome ${interaction.user.username}! Created a balance of ${currencyFormatter.format(1000)} for you.`}).catch(()=>{});
            } catch (err) {
                 console.error("Error creating user:", err);
                 await interaction.reply({ content: "Error setting up your account. Please try again later.", ephemeral: true });
                 return;
            }
        }

        // @ts-ignore
        const betString = interaction.options.getString('bet', true);
        const betAmount = parseInt(betString);

        if (isNaN(betAmount) || betAmount <= 0) {
            await interaction.reply({ content: 'Please enter a valid positive number for the bet.', ephemeral: true });
            return;
        }
        // Re-fetch userInfo right before balance check for most up-to-date value
        userInfo = await UserInfo.findOne({ uid: interaction.user.id });
        if (!userInfo || betAmount > userInfo.balance) {
            await interaction.reply({ content: `You don't have enough balance (${currencyFormatter.format(userInfo?.balance ?? 0)}) for this bet.`, ephemeral: true });
            return;
        }

        const initialBet = betAmount;

        // --- 2. Game Initialization ---
        let bj = new BlackjackUtils(6);
        bj.start();

        let currentBets = [initialBet];
        let activeHandIndex = 0;
        let gameState = GameState.PLAYER_TURN;
        let messageResponse: InteractionResponse | null = null;


        // --- 3. Check for Initial Blackjacks ---
        let playerInitialValue = bj.getValue(bj.playerHands[0]);
        let dealerInitialValue = bj.getValue(bj.dealerHand);
        const playerHasBlackjack = playerInitialValue === 21 && bj.playerHands[0].length === 2;
        const dealerHasBlackjack = dealerInitialValue === 21 && bj.dealerHand.length === 2;

        let finalEmbed: EmbedBuilder;
        let balanceChange = 0; // This is the net change AFTER accounting for the bet placement

        if (playerHasBlackjack || dealerHasBlackjack) {
            gameState = GameState.GAME_OVER;
            let resultDescription = "";
            let title = "Blackjack Result";

            const playerHandString = bj.generateHandString(bj.playerHands[0]);
            const dealerHandString = bj.generateHandString(bj.dealerHand); // Show full dealer hand

            if (playerHasBlackjack && dealerHasBlackjack) {
                title = "Push!";
                resultDescription = "Both you and the dealer have Blackjack.";
                balanceChange = 0; // No change in balance
            } else if (playerHasBlackjack) {
                title = "Blackjack!";
                resultDescription = `You win ${currencyFormatter.format(initialBet * 1.5)}!`;
                balanceChange = initialBet * 1.5; // Payout 3:2
            } else { // Dealer has Blackjack
                title = "Dealer Blackjack";
                resultDescription = "Dealer has Blackjack. You lose.";
                balanceChange = -initialBet; // Lose initial bet
            }

            // Update Balance (apply the change)
            // No need to deduct initially, just apply the final change relative to starting balance
            userInfo.balance += balanceChange;
            try { await userInfo.save(); } catch (e) { console.error("BJ Initial Save Error:", e); }


            finalEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(resultDescription)
                .addFields(
                    { name: `Your Hand (${playerInitialValue})`, value: playerHandString },
                    { name: `Dealer's Hand (${dealerInitialValue})`, value: dealerHandString }
                )
                .setColor(balanceChange > 0 ? 'Green' : balanceChange < 0 ? 'Red' : 'Grey')
                .setFooter({ text: `Balance: ${currencyFormatter.format(userInfo.balance)}` });

            await interaction.reply({ embeds: [finalEmbed], components: [] });
            return;
        }

        // --- 4. Initial Game State Embed & Buttons ---

        const createGameEmbed = (showDealerHoleCard = false): EmbedBuilder => {
            const embed = new EmbedBuilder()
                .setTitle(`Blackjack - Bet: ${currencyFormatter.format(initialBet)}`) // Show initial bet clearly
                .setColor('Blue')
                 // Show balance BEFORE potential deductions for split/double
                .setFooter({ text: `Total Bet: ${currencyFormatter.format(currentBets.reduce((a, b) => a + b, 0))} | Balance: ${currencyFormatter.format(userInfo?.balance ?? 0)}` });


            for (let i = 0; i < bj.playerHands.length; i++) {
                 const hand = bj.playerHands[i];
                 const handValue = bj.getValue(hand);
                 const handString = bj.generateHandString(hand);
                 const isActive = (i === activeHandIndex && gameState !== GameState.DEALER_TURN && gameState !== GameState.GAME_OVER);
                 const prefix = isActive ? '➡️ ' : '';
                  let suffix = '';
                  if (handValue > 21) suffix = ' - BUST';
                  else if (handValue === 21 && hand.length > 2) suffix = ' - 21'; // Distinguish 21 from Blackjack
                  else if (handValue === 21 && hand.length === 2 && i === 0 && bj.playerHands.length === 1) suffix = ' - BLACKJACK'; // Should have been caught earlier, but for safety

                 embed.addFields({ name: `${prefix}Hand ${bj.playerHands.length > 1 ? i + 1 : ''} (${handValue}${suffix}) | Bet: ${currencyFormatter.format(currentBets[i])}`, value: handString || " ", inline: bj.playerHands.length > 1 });
            }

             // Add Dealer Hand - ensure value is not zero if string is empty
            const dealerUpCardValue = bj.getValue([bj.dealerHand[0]]);
             const dealerValue = showDealerHoleCard ? bj.getValue(bj.dealerHand) : dealerUpCardValue;
             const dealerHandString = bj.generateHandString(bj.dealerHand, !showDealerHoleCard);
            const dealerSuffix = (showDealerHoleCard && bj.getValue(bj.dealerHand) > 21) ? ' - BUST' : '';
             // Add placeholder space if string is empty to prevent embed error
             embed.addFields({ name: `Dealer's Hand (${dealerValue}${dealerSuffix})`, value: dealerHandString || " ", inline: false });

            return embed;
        };

        const createButtonRow = (): ActionRowBuilder<ButtonBuilder> => {
            const row = new ActionRowBuilder<ButtonBuilder>();
            // Ensure activeHandIndex is valid
            if (activeHandIndex >= bj.playerHands.length) {
                 console.error("Invalid activeHandIndex:", activeHandIndex, "Player Hands:", bj.playerHands.length);
                 return row; // Return empty row if index is bad
            }
            const currentHand = bj.playerHands[activeHandIndex];
             // Handle case where currentHand might be unexpectedly empty/undefined
             if (!currentHand) {
                 console.error("Current hand is undefined for activeHandIndex:", activeHandIndex);
                 return row; // Return empty row
             }
            const handValue = bj.getValue(currentHand);

            if (handValue < 21) {
                row.addComponents(
                    new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
                );
            } else {
                 row.addComponents(
                      new ButtonBuilder().setCustomId('stand').setLabel(handValue > 21 ? 'Acknowledge Bust' : 'Continue').setStyle(ButtonStyle.Secondary)
                 );
            }

            // Ensure userInfo is available for balance checks
            const currentBalance = userInfo?.balance ?? 0;
            const handBet = currentBets[activeHandIndex] ?? initialBet; // Use initialBet as fallback

            // Double Down Conditions: Hand length 2, balance >= hand's bet, hand value < 21
            if (currentHand.length === 2 && currentBalance >= handBet && handValue < 21) {
                row.addComponents(
                    new ButtonBuilder().setCustomId('double_down').setLabel('Double Down').setStyle(ButtonStyle.Success)
                );
            }

             // Split Conditions: Hand length 2, cards same value, balance >= initial bet, max hands not reached
            if (currentHand.length === 2 &&
                currentHand[0]?.value === currentHand[1]?.value && // Safe access card value
                currentBalance >= initialBet &&
                bj.playerHands.length < 4) {
                 row.addComponents(
                     new ButtonBuilder().setCustomId('split').setLabel('Split').setStyle(ButtonStyle.Danger)
                 );
            }

            return row;
        };


         try {
             //@ts-ignore
             messageResponse = await interaction.reply({
                 embeds: [createGameEmbed()],
                 components: [createButtonRow()],
                 fetchReply: true
             });
         } catch (error) {
             console.error("Failed to send initial Blackjack reply:", error);
             try { await interaction.followUp({ content: "Sorry, couldn't start the game. Please try again.", ephemeral: true }); } catch {}
             return;
         }


        // --- 5. Interaction Collector Loop ---
        // Ensure messageResponse exists before creating collector
        if (!messageResponse) {
             console.error("messageResponse is null, cannot create collector.");
             return;
         }
        const collector = messageResponse.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i: ButtonInteraction<CacheType>) => i.user.id === interaction.user.id,
            time: 120_000
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
             // Re-fetch user info at start of collection to ensure fresh balance data
             userInfo = await UserInfo.findOne({ uid: interaction.user.id });
             if (!userInfo) {
                 console.error("User info not found during interaction collection.");
                 await buttonInteraction.reply({ content: "Could not find your account information.", ephemeral: true });
                 collector.stop("User info lost");
                 return;
             }

            try {
                await buttonInteraction.deferUpdate();

                // Ensure activeHandIndex is valid before accessing hands
                 if (activeHandIndex >= bj.playerHands.length || !bj.playerHands[activeHandIndex]) {
                     console.error("Collector Error: Invalid activeHandIndex or hand missing.", activeHandIndex, bj.playerHands);
                     collector.stop("Internal state error");
                     await buttonInteraction.editReply({ content: "Game state error, please start a new game.", embeds: [], components: [] });
                     return;
                 }

                const currentHand = bj.playerHands[activeHandIndex];
                let handValue = bj.getValue(currentHand);

                if (gameState === GameState.GAME_OVER) {
                     // collector.stop("Game already ended."); // Stop redundant if already over?
                    return;
                }

                let proceedToDealer = false;
                let handFinished = false;
                let balanceUpdated = false; // Track if balance was modified in this step

                // --- HIT ---
                if (buttonInteraction.customId === 'hit') {
                    if (handValue < 21) {
                        bj.deal(currentHand, 1);
                        handValue = bj.getValue(currentHand);
                        if (handValue >= 21) {
                             handFinished = true;
                        }
                    } else {
                         handFinished = true;
                    }
                }

                // --- STAND ---
                else if (buttonInteraction.customId === 'stand') {
                     handFinished = true;
                }

                // --- DOUBLE DOWN ---
                 else if (buttonInteraction.customId === 'double_down') {
                      const betToDouble = currentBets[activeHandIndex];
                     if (currentHand.length === 2 && userInfo.balance >= betToDouble && handValue < 21) {
                          userInfo.balance -= betToDouble;
                          currentBets[activeHandIndex] += betToDouble;
                          balanceUpdated = true; // Mark balance as modified

                          bj.deal(currentHand, 1);
                          handValue = bj.getValue(currentHand);
                          handFinished = true;
                     } else {
                          await buttonInteraction.followUp({ content: "Cannot Double Down now.", ephemeral: true });
                          return;
                     }
                 }

                // --- SPLIT ---
                else if (buttonInteraction.customId === 'split') {
                     // Add safety check for card values before accessing
                     if (currentHand.length === 2 &&
                         currentHand[0]?.value === currentHand[1]?.value &&
                         userInfo.balance >= initialBet &&
                         bj.playerHands.length < 4)
                     {
                          userInfo.balance -= initialBet; // Cost of split
                          balanceUpdated = true; // Mark balance as modified

                          const cardToMove = currentHand.pop()!;
                          const newHand = [cardToMove];
                          bj.playerHands.splice(activeHandIndex + 1, 0, newHand);
                          currentBets.splice(activeHandIndex + 1, 0, initialBet);

                          bj.deal(currentHand, 1);
                          bj.deal(newHand, 1);

                          handValue = bj.getValue(currentHand); // Update current hand value after dealing
                          // Ace split special logic could go here - e.g., auto-stand if value is 21
                           if(currentHand[0].symbol === 'A' && bj.getValue(currentHand) === 21) {
                                // Optional: Auto-stand the first Ace hand if it's 21
                                // handFinished = true; // Uncomment if auto-stand desired
                           }
                           if(newHand[0].symbol === 'A' && bj.getValue(newHand) === 21) {
                                // Optional: Mark the second hand to be auto-stood when it becomes active
                           }


                     } else {
                         await buttonInteraction.followUp({ content: "Cannot Split now.", ephemeral: true });
                         return;
                     }
                 }

                 // --- Save balance if it was modified ---
                 if(balanceUpdated) {
                     try {
                         await userInfo.save();
                     } catch(err) {
                         console.error("Error saving balance after split/double:", err);
                         // Decide how to handle this - maybe revert the action? Rollback is complex.
                         // For now, log the error and continue, but the balance shown might be temporarily wrong.
                         await buttonInteraction.followUp({ content: "Error saving balance update. Please check your balance later.", ephemeral: true });
                     }
                 }


                // --- Update State & Check for Next Step ---
                if(handFinished) {
                     if (activeHandIndex < bj.playerHands.length - 1) {
                         activeHandIndex++;
                         gameState = GameState.PLAYER_TURN; // Stay in player turn for next hand
                     } else {
                         proceedToDealer = true;
                         gameState = GameState.DEALER_TURN;
                     }
                 }


                // --- Dealer's Turn Logic ---
                if (proceedToDealer) {
                    let dealerValue = bj.getValue(bj.dealerHand);

                    await buttonInteraction.editReply({ embeds: [createGameEmbed(true)], components: [] });
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    while (dealerValue < 17) {
                         bj.deal(bj.dealerHand, 1);
                         dealerValue = bj.getValue(bj.dealerHand);
                         await buttonInteraction.editReply({ embeds: [createGameEmbed(true)], components: [] });
                         await new Promise(resolve => setTimeout(resolve, 750));
                    }

                    // --- Determine Winner & Final Payout ---
                     gameState = GameState.GAME_OVER;
                     // Don't stop collector here, let the 'end' event handle cleanup

                    let totalBalanceChange = 0;
                    const finalDealerValue = bj.getValue(bj.dealerHand);
                    const resultEmbed = new EmbedBuilder()
                        .setTitle('Blackjack Results')
                        .setColor('Yellow'); // Default color

                     // Calculate winnings relative to bets placed
                     let totalBetPlaced = 0;
                     let totalReturned = 0;

                    for(let i = 0; i < bj.playerHands.length; i++) {
                         const playerHand = bj.playerHands[i];
                         const playerValue = bj.getValue(playerHand);
                         const handBet = currentBets[i];
                         totalBetPlaced += handBet;
                         let handResult = "";
                         let handReturn = 0; // Amount returned for this hand (0 for loss, bet for push, 2*bet for win)

                         if (playerValue > 21) {
                             handResult = "BUST";
                             handReturn = 0;
                         } else if (finalDealerValue > 21 || playerValue > finalDealerValue) {
                             handResult = "WIN";
                             handReturn = handBet * 2; // Win bet + original bet back
                         } else if (playerValue < finalDealerValue) {
                             handResult = "LOSE";
                             handReturn = 0;
                         } else { // Push
                             handResult = "PUSH";
                             handReturn = handBet; // Original bet back
                         }

                         totalReturned += handReturn;
                          // Display result per hand
                          resultEmbed.addFields({
                              name: `Hand ${bj.playerHands.length > 1 ? i + 1 : ''} (${playerValue}) - ${handResult}`,
                              value: `${bj.generateHandString(playerHand)} | Bet: ${currencyFormatter.format(handBet)} | Return: ${currencyFormatter.format(handReturn)}`,
                              inline: bj.playerHands.length > 1
                          });
                    }

                     // Calculate net change: (Total Returned) - (Total Bet Placed)
                     // However, bets were already deducted for double/split. Need careful final accounting.
                     // Let's recalculate based on initial state:
                     // Start with user's balance *before* this interaction started.
                     // Add payouts for wins/pushes. Subtract initial bet for losses.
                     // This avoids complexity of tracking mid-game deductions.

                     // Re-fetch balance *before* applying final changes
                     const balanceBeforeFinalCalc = userInfo.balance;
                     let finalBalanceChange = 0;

                     for(let i = 0; i < bj.playerHands.length; i++) {
                          const playerValue = bj.getValue(bj.playerHands[i]);
                          const handBet = currentBets[i]; // This is the *final* bet for the hand (could be doubled)
                          const isInitialHand = (i === 0 && bj.playerHands.length === 1 && !currentBets.slice(1).length); // Check if it's the single, non-split/doubled hand
                          const costOfHand = (i === 0) ? initialBet : initialBet; // Split cost is initialBet, Double cost adds initialBet

                          if (playerValue > 21) { // Bust
                              finalBalanceChange -= handBet;
                          } else if (finalDealerValue > 21 || playerValue > finalDealerValue) { // Win
                              finalBalanceChange += handBet; // Win amount equal to the final bet placed on hand
                          } else if (playerValue < finalDealerValue) { // Lose
                               finalBalanceChange -= handBet;
                          } else { // Push
                              // No change for push (bet is returned)
                          }
                      }


                     // Apply the final calculated change to the *original* balance
                     // Fetch the absolute latest balance before saving
                      userInfo = await UserInfo.findOne({ uid: interaction.user.id });
                      if (!userInfo) throw new Error("User disappeared before final save");

                      // Calculate the NEW balance based on the change
                      // This approach is less prone to errors from intermediate saves
                      const startingBalance = userInfo.balance + currentBets.reduce((sum, bet) => sum + bet, 0) - initialBet; // Estimate balance before bets were placed THIS round
                      // OR simpler: just apply finalBalanceChange to current balance, assuming intermediate saves worked.
                      // Let's stick to applying finalBalanceChange to the current fetched balance
                      userInfo.balance += finalBalanceChange;


                      // Add final dealer hand and balance footer
                      resultEmbed.addFields({ name: `Dealer's Hand (${finalDealerValue}${finalDealerValue > 21 ? ' - BUST' : ''})`, value: bj.generateHandString(bj.dealerHand), inline: false });
                      resultEmbed.setFooter({ text: `Bets Returned: ${currencyFormatter.format(totalReturned)} | Final Balance: ${currencyFormatter.format(userInfo.balance)}` });

                     if(finalBalanceChange > 0) resultEmbed.setColor('Green');
                     else if(finalBalanceChange < 0) resultEmbed.setColor('Red');
                     else resultEmbed.setColor('Grey');

                     // --- Final Save ---
                     await userInfo.save().catch((e) => {
                          console.error("BJ Final Save Error:", e);
                          resultEmbed.setFooter({ text: `Bets Returned: ${currencyFormatter.format(totalReturned)} | Error saving final balance.` });
                          resultEmbed.setColor('DarkRed');
                      });

                    await buttonInteraction.editReply({ embeds: [resultEmbed], components: [] });
                    collector.stop("Game completed normally."); // Stop collector after results shown

                    //@ts-ignore
                } else if (gameState !== GameState.GAME_OVER) {
                    // Update Embed and Buttons for next player action
                     await buttonInteraction.editReply({
                         embeds: [createGameEmbed()],
                         components: [createButtonRow()]
                     });
                 }


            } catch (error) {
                console.error('Error during Blackjack interaction:', error);
                 // Avoid stopping collector here if already stopped inside logic
                 if (gameState !== GameState.GAME_OVER) {
                     collector.stop("Error occurred.");
                     gameState = GameState.GAME_OVER;
                 }
                 try {
                     await buttonInteraction?.editReply({ content: 'An error occurred during the game. Cancelling.', embeds: [], components: [] }).catch(() => {});
                 } catch {}
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (gameState !== GameState.GAME_OVER && messageResponse) {
                 console.log(`Blackjack collector ended for user ${interaction.user.id}, Reason: ${reason}`);
                 try {
                     const finalEmbed = createGameEmbed(true); // Show dealer hand
                     finalEmbed.setTitle('Blackjack Game Ended');
                     finalEmbed.setDescription(`Game ended due to: ${reason === 'time' ? 'Inactivity' : reason}. Bets placed may be lost.`);
                      finalEmbed.setColor('DarkGrey');
                     await messageResponse.edit({ embeds: [finalEmbed], components: [] }).catch(e => console.error("Error editing message on collector end:", e));
                 } catch (error) {
                     console.error("Error processing collector end:", error);
                 }
             }
             gameState = GameState.GAME_OVER; // Ensure state is final
        });
    }
};