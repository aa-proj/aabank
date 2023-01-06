import {BaseCommandInteraction, Interaction, Message} from "discord.js";
import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {User} from "./entity/user";
import {Transaction} from "./entity/transaction";
import {userCheckInit} from "./lib";

import "./api"


const discord_token = process.env.AABANK_TOKEN
export const AA_GUILD_ID = "606109479003750440"

if (!discord_token) {
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
export let connection: Connection | null = null;

async function connectDB() {
  connection = await createConnection(options);

  // なんかこれをしないとSyncできなかったけど、あんまりSyncするのは良くない（データが飛ぶ)
  // 対策: マイグレーションファイルをきちんと生成する
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
}, {
  name: 'rank',
  description: '所持金ランキングを確認します。',
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

const {Client, Intents} = require('discord.js');
export const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Slash Commandの登録
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(client.user?.id, AA_GUILD_ID),
      // デバッグ用の環境変数が設定されていた時にcommandを前処理
      {
        body: commands.map(r => {
          r.name = process.env.CMD_PREFIX + r.name;
          return r
        })
      },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  // デバッグ用の環境変数が設定されていた時にcommandを前処理
  if (process.env.CMD_PREFIX) {
    interaction.commandName = interaction.commandName.replace(process.env.CMD_PREFIX, "")
  }


  const userRepository = await connection?.getRepository(User)
  const transactionRepository = await connection?.getRepository(Transaction)

  // 残高確認
  if (interaction.commandName === 'balance') {
    const userId = interaction.options.get("user")?.user?.id || interaction.user.id
    const user = await userCheckInit(userId)
    if (!user) {
      // ここには来ないはず
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
    return
  }

  // 送金
  if (interaction.commandName === "send") {
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

    fromUser.amount -= amount
    toUser.amount += amount
    await userRepository?.save(fromUser)
    await userRepository?.save(toUser)
    await interaction.reply(`<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しました。`)
    const transaction = await transactionRepository?.create({
      fromUser, toUser, amount, timestamp: new Date(), memo
    })
    await transactionRepository?.save(<Transaction>transaction)
  }

  if (interaction.commandName === "transaction") {
    const userId = interaction.options.get("user")?.user?.id || interaction.user.id
    const user = await userCheckInit(userId)
    const userTransaction = await transactionRepository?.find({
      where: [{toUser: user}, {fromUser: user}],
      relations: ["fromUser", "toUser"],
      order: {id: "DESC"},
      take: 10
    })
    await interaction.reply(await getTransactionText(userTransaction || []))
  }

  if (interaction.commandName === "rank") {
    const users = (await userRepository?.find())?.sort((a, b) => {
      return (a.amount < b.amount) ? 1 : -1
    })
    let reply = []
    for (const u of users || []) {
      reply.push(`${await getNamefromID(u.discordId)}: ${u.amount}ああP `)
    }
    // console.log(reply)
    await interaction.reply(`\`\`\`${reply.join("\n")}\`\`\``)
    setTimeout(() => interaction.deleteReply(), 10000)
  }

});

async function getNamefromID(id: any) {
  let g = client.guilds.cache.get(AA_GUILD_ID);
  const member = await g?.members.fetch(id)
  let nickName = member.nickname?.replace("@", "＠");
  if (!nickName) nickName = member.displayName;
  return nickName;
}

async function getTagFromId(id: any) {
  let g = client.guilds.cache.get(AA_GUILD_ID);
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


client.login(discord_token);
