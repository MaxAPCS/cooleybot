import { ApplicationCommandOptionType, ApplicationCommandType, Client, GatewayIntentBits, InteractionType } from 'discord.js';
import fs from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.MessageContent] });
const config = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf8"}))

client.on("ready", async () => {
    if (!client.user) throw new Error("Couldn't obtain a user for the client.");
    await (await client.guilds.fetch("1012104044690554983")).commands.set([{
        "name": "addquote",
        "type": ApplicationCommandType.ChatInput,
        "description": "Quotes must be submitted on the day they are spoken",
        "options": [
            {
                "name": "person",
                "description": "Who said the quote",
                "type": ApplicationCommandOptionType.String,
                "choices": Object.keys(config).map(p=>({name: p, value: p})),
                "required": true
            },
            {
                "name": "category",
                "description": "What the quote was about",
                "type": ApplicationCommandOptionType.String,
                "autocomplete": true,
                "required": true
            },
            {
                "name": "quote",
                "description": "What the quote was",
                "type": ApplicationCommandOptionType.String,
                "required": true,
                "minLength": 4
            },
            {
                "name": "time",
                "description": "When the quote was said [HH:mm]",
                "type": ApplicationCommandOptionType.String,
                "required": false,
                "minLength": 4
            }
        ]
    }]);
    console.info(`Bot Ready! [${client.user.tag}] <@${client.user.id}>`);
})

client.on("interactionCreate", async interaction => {
    switch (interaction.type) {
        case InteractionType.ApplicationCommand:
            const person = interaction.options.getString("person")
            const category = interaction.options.getString("category")
            if (!config[person][category])
                return interaction.reply({"content": `Available categories for ${person}: ${Object.keys(config[person]).join(", ")}`, "ephemeral": true})
            const quoteobj = {
                "date": new Date().toLocaleDateString("en-US"),
                "text": interaction.options.getString("quote")
            };
            if (interaction.options.getString("time", false))
                quoteobj["time"] = new Date(`${quoteobj.date} ${interaction.options.getString("time")}`).toLocaleTimeString("en-US", {"timeStyle": "short"});
            config[person][category].quotes.push(quoteobj)
            await fs.promises.writeFile("config.json", JSON.stringify(config, null, 2))
            await interaction.reply(`> ${quoteobj.text} [${category}]\n  - ${person}, ${quoteobj.date} ${quoteobj.time}`)
        break;
        case InteractionType.ApplicationCommandAutocomplete:
            const fval = interaction.options.getFocused();
            await interaction.respond(
                Object.keys(config[interaction.options.getString("person")])
                .filter(c=>c.startsWith(fval))
                .map(choice => ({ name: choice, value: choice }))
            )
        break;
    }
})

client.on("messageCreate", message => {
    if (message.author.id === client.user.id) return;
    for (let [person, pdata] of Object.entries(config)) {
        for (let [category, {"triggers": triggers, "quotes": quotes}] of Object.entries(pdata)) {
            if (triggers.length === 0 || quotes.length === 0) continue
            if (!triggers.some(trigger => new RegExp(`([^\w]|^)${trigger}([^\w]|$)`, "i").test(message.content))) continue
            const quote = quotes[Math.floor(Math.random()*quotes.length)]
            return message.reply(quote.text
                .replace("%u", `<@${message.author.id}>`)
            )
        }
    }
})

client.login(fs.readFileSync("token.txt", {encoding: "utf8"}));
