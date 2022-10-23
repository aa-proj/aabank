import {BaseCommandInteraction, Interaction, Message} from "discord.js";
import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {User} from "./entity/user";
import {Transaction} from "./entity/transaction";

import express from "express"

const app = express()
app.use(express.json())
const server = app.listen(9989, function () {
    console.log("web server OK")
})

const discord_token = process.env.AABANK_TOKEN

if(!discord_token) {
    throw new Error("TOKEN_NOT_PROVIDED")
}

const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');

const options: ConnectionOptions = {
    type: "sqlite",
    database: "./db/db.sqlite3",
    entities: [User, Transaction],
    synchronize: false,
};

// TypeORMのコネクション 使う前にnullチェックが必要
let connection: Connection | null = null;

async function connectDB() {
    connection = await createConnection(options);
    await connection.query("PRAGMA foreign_keys=OFF");
    await connection.synchronize();
    await connection.query("PRAGMA foreign_keys=ON");
}

// コネクションする
connectDB();

const commands = [{
    name: 'balance',
    description: '所持金を確認します。ユーザをつけるとそのユーザの所持金が見れます',
    options: [
        {
            name: "user",
            required: false,
            description: "ユーザ",
            type: 6
        }
    ]
},
    {
        name: 'send',
        description: '自分の所持金からユーザに対してお金を送金します',
        options: [
            {
                name: "user",
                required: true,
                description: "ユーザ",
                type: 6
            },
            {
                name: "amount",
                required: true,
                description: "量",
                type: 4
            },
            {
                name: "memo",
                required: false,
                description: "取引のメモ",
                type: 3
            }
        ]
    },
    {
        name: 'transaction',
        description: 'ユーザの送金履歴を見ます。ユーザをつけるとそのユーザの送金履歴が見れます',
        options: [
            {
                name: "user",
                required: false,
                description: "ユーザ",
                type: 6
            }
        ]
    }];

const rest = new REST({version: '9'}).setToken(discord_token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands("885834421771567125", "606109479003750440"),
            {body: commands},
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

const {Client, Intents} = require('discord.js');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'balance') {
        const userId = interaction.options.get("user")?.user?.id || interaction.user.id
        const user = await userCheckInit(userId)
        if (!user) {
            await interaction.reply("エラー　ますだくんにれんらくしてね (balance ユーザ初期化)")
            return
        }
        const i: BaseCommandInteraction = interaction
        i.reply({content: `<@${userId}> さんのああポイント残高 : ${user.amount}`, fetchReply: true}).then((r) => {
            setTimeout(() => {
                if ((r as Message).deletable) {
                    (r as Message).delete()
                }
            }, 10000)

        });
    } else if (interaction.commandName === "send") {
        const toUserId = interaction.options.get("user")?.user?.id || ""
        const fromUserId = interaction.user.id
        const amount = Number(interaction.options.get("amount")?.value) || 0
        const memo = interaction.options.get("memo")?.value + "" || ""
        if (toUserId === "") {
            await interaction.reply("エラー ますだくんにれんらくしてね (宛先ID null)")
            return
        }
        if (toUserId === fromUserId) {
            interaction.reply({
                content: `自分には送金できません`,
                fetchReply: true
            }).then((r) => {
                setTimeout(() => {
                    if ((r as Message).deletable) {
                        (r as Message).delete()
                    }
                }, 10000)
            })
            return
            return
        }
        const toUser = await userCheckInit(toUserId)
        const fromUser = await userCheckInit(fromUserId)
        if (!toUser || !fromUser) {
            await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
            return
        }
        if (amount <= 0) {
            interaction.reply({
                content: `0ああP以下の送金はできません`,
                fetchReply: true
            }).then((r) => {
                setTimeout(() => {
                    if ((r as Message).deletable) {
                        (r as Message).delete()
                    }
                }, 10000)
            })
            return
        }
        if (fromUser.amount < amount) {
            interaction.reply({
                content: `<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しようとしましたが、おかねがたりませんでした　ﾌﾟﾌﾟﾌﾟ`,
                fetchReply: true
            }).then((r) => {
                setTimeout(() => {
                    if ((r as Message).deletable) {
                        (r as Message).delete()
                    }
                }, 10000)
            })
            return
        }

        const userRepository = await connection?.getRepository(User)
        fromUser.amount -= amount
        toUser.amount += amount
        await userRepository?.save(fromUser)
        await userRepository?.save(toUser)
        await interaction.reply(`<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しました。`)
        const transactionRepository = await connection?.getRepository(Transaction)
        const transaction = await transactionRepository?.create({
            fromUser, toUser, amount, timestamp: new Date(), memo
        })
        await transactionRepository?.save(<Transaction>transaction)

    } else if (interaction.commandName === "transaction") {
        const userId = interaction.options.get("user")?.user?.id || interaction.user.id
        const user = await userCheckInit(userId)
        const transactionRepository = await connection?.getRepository(Transaction)
        const userTransaction = await transactionRepository?.find({
            where: [{toUser: user}, {fromUser: user}],
            relations: ["fromUser", "toUser"],
            order: {id: "DESC"},
            take: 10
        })
        await interaction.reply(await getTransactionText(userTransaction || []))
    }
});

async function getNamefromID(id: any) {
    let g = client.guilds.cache.get("606109479003750440");
    // console.log(await (g?.members.fetch(id)))
    const member = await g?.members.fetch(id)
    let nickName = member.nickname?.replace("@", "＠");
    if (!nickName) nickName = member.displayName;
    return nickName;
}

async function getTagFromId(id: any) {
    let g = client.guilds.cache.get("606109479003750440");
    // console.log(await (g?.members.fetch(id)))
    const member = await g?.members.fetch(id)
    return member.user.username + "#" + member.user.discriminator;
}

async function getTransactionText(transaction: Transaction[] | null): Promise<string> {
    if (!transaction || transaction.length === 0) return "取引はありません。"
    let transactionText = ""
    let tmp = [];
    for (const t of transaction) {
        // console.log(t)
        tmp.push((await getTagFromId(t.fromUser?.discordId)) + "→" + (await getTagFromId(t.toUser?.discordId)) + " : " + t.amount + "ああP");
    }

    return tmp.join("\n")
}

async function userCheckInit(userId: string) {
    const userRepository = await connection?.getRepository(User);
    const user = await userRepository?.findOne({discordId: userId})
    if (!user) {
        // 未登録
        console.log("new user" + userId)
        const newUser = await userRepository?.create({discordId: userId, amount: 0})
        await userRepository?.save(<User>newUser)
        return newUser
    }
    return user
}


app.post("/", async function (req, res, next) {
    const request = req.body
    if (!request.fromId || !request.toId || !request.amount) {
        res.json({success: false, message: "bad request"})
        return
    }

    let g = client.guilds.cache.get("606109479003750440");

    if (request.fromId === "885834421771567125") {
        // 国営銀行からの送金
        const to = await userCheckInit(request.toId)
        const from = await userCheckInit(request.fromId)
        const fromUser = await g?.members.fetch(request.fromId)
        const toUser = await g?.members.fetch(request.toId)
        const userRepository = await connection?.getRepository(User)
        if (!to || !from) {
            // await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
            return
        }
        to.amount += request.amount
        await userRepository?.save(to)

        const transactionRepository = await connection?.getRepository(Transaction)
        const transaction = await transactionRepository?.create({
            fromUser: from, toUser: to, amount: Number(request.amount), timestamp: new Date(), memo: request.memo
        })
        await transactionRepository?.save(<Transaction>transaction)
        res.json({success: true})
        return
    } else {
        // 普通の送金
        const to = await userCheckInit(request.toId)
        const from = await userCheckInit(request.fromId)
        const userRepository = await connection?.getRepository(User)
        if (!to || !from) {
            // await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
            res.json({success: false, message: "internal"})
            return
        }
        if (from.amount < request.amount) {
            res.json({success: false, message: "not_enough_money"})
            return
        }
        from.amount -= request.amount
        to.amount += request.amount
        await userRepository?.save(to)
        await userRepository?.save(from)

        const transactionRepository = await connection?.getRepository(Transaction)
        const transaction = await transactionRepository?.create({
            fromUser: from, toUser: to, amount: Number(request.amount), timestamp: new Date(), memo: request.memo
        })
        await transactionRepository?.save(<Transaction>transaction)
        res.json({success: true})
        return
    }
});

app.get("/:id", async function (req, res, next) {
    const userRepository = await connection?.getRepository(User)
    const user = await userRepository?.findOne({where: {discordId: req.params.id}})
    if (!user) {
        res.json({
            success: false,
            message: "user_not_found"
        })
        return
    }
    res.json({
        success: true,
        amount: user.amount
    })

})

client.login(discord_token);
