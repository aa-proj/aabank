"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const user_1 = require("./entity/user");
const transaction_1 = require("./entity/transaction");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const server = app.listen(9989, function () {
    console.log("web server OK");
});
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const options = {
    type: "sqlite",
    database: "./db/db.sqlite3",
    entities: [user_1.User, transaction_1.Transaction],
    synchronize: false,
};
// TypeORMのコネクション 使う前にnullチェックが必要
let connection = null;
async function connectDB() {
    connection = await (0, typeorm_1.createConnection)(options);
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
const rest = new REST({ version: '9' }).setToken('ODg1ODM0NDIxNzcxNTY3MTI1.YTszmA.uOItJkq9XRnGnAwevxU-fpYFkdg');
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands("885834421771567125", "606109479003750440"), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
})();
const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
client.on('interactionCreate', async (interaction) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!interaction.isCommand())
        return;
    if (interaction.commandName === 'balance') {
        const userId = ((_b = (_a = interaction.options.get("user")) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id) || interaction.user.id;
        const user = await userCheckInit(userId);
        if (!user) {
            await interaction.reply("エラー　ますだくんにれんらくしてね (balance ユーザ初期化)");
            return;
        }
        const i = interaction;
        i.reply({ content: `<@${userId}> さんのああポイント残高 : ${user.amount}`, fetchReply: true }).then((r) => {
            setTimeout(() => {
                if (r.deletable) {
                    r.delete();
                }
            }, 10000);
        });
    }
    else if (interaction.commandName === "send") {
        const toUserId = ((_d = (_c = interaction.options.get("user")) === null || _c === void 0 ? void 0 : _c.user) === null || _d === void 0 ? void 0 : _d.id) || "";
        const fromUserId = interaction.user.id;
        const amount = Number((_e = interaction.options.get("amount")) === null || _e === void 0 ? void 0 : _e.value) || 0;
        const memo = ((_f = interaction.options.get("memo")) === null || _f === void 0 ? void 0 : _f.value) + "" || "";
        if (toUserId === "") {
            await interaction.reply("エラー ますだくんにれんらくしてね (宛先ID null)");
            return;
        }
        if (toUserId === fromUserId) {
            await interaction.reply("自分には送金できません。");
            return;
        }
        const toUser = await userCheckInit(toUserId);
        const fromUser = await userCheckInit(fromUserId);
        if (!toUser || !fromUser) {
            await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)");
            return;
        }
        if (amount <= 0) {
            await interaction.reply("0ああP以下の送金はできません。");
            return;
        }
        if (fromUser.amount < amount) {
            await interaction.reply(`<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しようとしましたが、おかねがたりませんでした　ﾌﾟﾌﾟﾌﾟ`);
            return;
        }
        const userRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(user_1.User));
        fromUser.amount -= amount;
        toUser.amount += amount;
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(fromUser));
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(toUser));
        await interaction.reply(`<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しました。`);
        const transactionRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(transaction_1.Transaction));
        const transaction = await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.create({
            fromUser, toUser, amount, timestamp: new Date(), memo
        }));
        await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.save(transaction));
    }
    else if (interaction.commandName === "transaction") {
        const userId = ((_h = (_g = interaction.options.get("user")) === null || _g === void 0 ? void 0 : _g.user) === null || _h === void 0 ? void 0 : _h.id) || interaction.user.id;
        const user = await userCheckInit(userId);
        const transactionRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(transaction_1.Transaction));
        const userTransaction = await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.find({
            where: [{ toUser: user }, { fromUser: user }],
            relations: ["fromUser", "toUser"],
            order: { id: "DESC" },
            take: 10
        }));
        await interaction.reply(await getTransactionText(userTransaction || []));
    }
});
async function getNamefromID(id) {
    var _a;
    let g = client.guilds.cache.get("606109479003750440");
    // console.log(await (g?.members.fetch(id)))
    const member = await (g === null || g === void 0 ? void 0 : g.members.fetch(id));
    let nickName = (_a = member.nickname) === null || _a === void 0 ? void 0 : _a.replace("@", "＠");
    if (!nickName)
        nickName = member.displayName;
    return nickName;
}
async function getTagFromId(id) {
    let g = client.guilds.cache.get("606109479003750440");
    // console.log(await (g?.members.fetch(id)))
    const member = await (g === null || g === void 0 ? void 0 : g.members.fetch(id));
    return member.user.username + "#" + member.user.discriminator;
}
async function getTransactionText(transaction) {
    var _a, _b;
    if (!transaction || transaction.length === 0)
        return "取引はありません。";
    let transactionText = "";
    let tmp = [];
    for (const t of transaction) {
        // console.log(t)
        tmp.push((await getTagFromId((_a = t.fromUser) === null || _a === void 0 ? void 0 : _a.discordId)) + "→" + (await getTagFromId((_b = t.toUser) === null || _b === void 0 ? void 0 : _b.discordId)) + " : " + t.amount + "ああP");
    }
    return tmp.join("\n");
}
async function userCheckInit(userId) {
    const userRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(user_1.User));
    const user = await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.findOne({ discordId: userId }));
    if (!user) {
        // 未登録
        console.log("new user" + userId);
        const newUser = await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.create({ discordId: userId, amount: 0 }));
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(newUser));
        return newUser;
    }
    return user;
}
app.post("/", async function (req, res, next) {
    const request = req.body;
    if (!request.fromId || !request.toId || !request.amount) {
        res.json({ success: false, message: "bad request" });
        return;
    }
    let g = client.guilds.cache.get("606109479003750440");
    if (request.fromId === "885834421771567125") {
        // 国営銀行からの送金
        const to = await userCheckInit(request.toId);
        const from = await userCheckInit(request.fromId);
        const fromUser = await (g === null || g === void 0 ? void 0 : g.members.fetch(request.fromId));
        const toUser = await (g === null || g === void 0 ? void 0 : g.members.fetch(request.toId));
        const userRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(user_1.User));
        if (!to || !from) {
            // await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
            return;
        }
        to.amount += request.amount;
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(to));
        const transactionRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(transaction_1.Transaction));
        const transaction = await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.create({
            fromUser: from, toUser: to, amount: Number(request.amount), timestamp: new Date(), memo: request.memo
        }));
        await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.save(transaction));
        res.json({ success: true });
        return;
    }
    else {
        // 普通の送金
        const to = await userCheckInit(request.toId);
        const from = await userCheckInit(request.fromId);
        const userRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(user_1.User));
        if (!to || !from) {
            // await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
            res.json({ success: false, message: "internal" });
            return;
        }
        if (from.amount < request.amount) {
            res.json({ success: false, message: "not_enough_money" });
            return;
        }
        from.amount -= request.amount;
        to.amount += request.amount;
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(to));
        await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.save(from));
        const transactionRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(transaction_1.Transaction));
        const transaction = await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.create({
            fromUser: from, toUser: to, amount: Number(request.amount), timestamp: new Date(), memo: request.memo
        }));
        await (transactionRepository === null || transactionRepository === void 0 ? void 0 : transactionRepository.save(transaction));
        res.json({ success: true });
        return;
    }
});
app.get("/:id", async function (req, res, next) {
    const userRepository = await (connection === null || connection === void 0 ? void 0 : connection.getRepository(user_1.User));
    const user = await (userRepository === null || userRepository === void 0 ? void 0 : userRepository.findOne({ where: { discordId: req.params.id } }));
    if (!user) {
        res.json({
            success: false,
            message: "user_not_found"
        });
        return;
    }
    res.json({
        success: true,
        amount: user.amount
    });
});
client.login('ODg1ODM0NDIxNzcxNTY3MTI1.YTszmA.uOItJkq9XRnGnAwevxU-fpYFkdg');
