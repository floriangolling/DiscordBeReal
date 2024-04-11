import { CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// TODO: Find how to properly links the execute command to the interaction event
// The discordJS documentation seems to be outdated for this, so i supposed we can just loop over folder
// and create a "array function pointer" for the listenerComand interactions

module.exports = {
    data: new SlashCommandBuilder().setName(`help`).setDescription(`Display info about yourself!`),
    async execute(interaction: CommandInteraction) {
        const userInfo = new EmbedBuilder()
            .setColor(`#0099ff`)
            .setTitle(`**User Info**`)
            .addFields(
                { name: `Your username:`, value: `${interaction.user.tag}`, inline: true },
                { name: `Your ID:`, value: `${interaction.user.id}`, inline: true },
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        interaction.reply({ embeds: [userInfo] });
    },
};
