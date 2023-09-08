import {
  CommandInteraction,
  Interaction,
  Message,
  REST,
  Routes,
  Client,
  IntentsBitField,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} from "discord.js";
import {Connection, ConnectionOptions, createConnection} from "typeorm";
import {User} from "./entity/user";
import {Transaction} from "./entity/transaction";
import {SEND_RESULT, sendAAP, userCheckInit} from "./lib";

import "./api"
import {AA_GUILD_ID, SLASH_COMMAND} from "./constant";


const discord_token = process.env.AABANK_TOKEN

if (!discord_token) {
  throw new Error("TOKEN_NOT_PROVIDED")
}

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


const rest = new REST({version: '9'}).setToken(discord_token);

export const client = new Client({
  intents: [IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ]
});

client.on('ready', async (c) => {
  console.log(`Logged in as ${c.user.tag}!`);

  // Slash Commandの登録
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(c.user.id, AA_GUILD_ID),
      // デバッグ用の環境変数が設定されていた時にcommandを前処理
      {
        body: SLASH_COMMAND.map(r => {
          r.name = (process.env.CMD_PREFIX || "")  + r.name;
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
  if (interaction.isChatInputCommand()) {

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

      const i: CommandInteraction = interaction
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

      const transactionResult = await sendAAP(fromUserId, toUserId, amount, memo)
      switch (transactionResult) {
        case SEND_RESULT.FROM_TO_SAME:
          interactionReplyAndDelete(interaction, "自分には送金できません", 10000)
          break
        case SEND_RESULT.USERID_IS_EMPTY:
          await interaction.reply("エラー ますだくんにれんらくしてね (宛先ID null)")
          break
        case SEND_RESULT.INVALID_AMOUNT:
          interactionReplyAndDelete(interaction, "0ああP以下の送金はできません", 10000)
          break
        case SEND_RESULT.NOT_ENOUGH_MONEY:
          const nem = `<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しようとしましたが、おかねがたりませんでした　ﾌﾟﾌﾟﾌﾟ`
          interactionReplyAndDelete(interaction, nem, 10000)
          break
        case SEND_RESULT.UNKNOWN:
          await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
          break
        case SEND_RESULT.SUCCESS:
          const success = `<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント送金しました。`
          await interaction.reply(success)
          break
      }
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

    if (interaction.commandName === "harae" || interaction.commandName === "seikyu" || interaction.commandName === "request") {
      // 請求するので、from toが逆
      const fromUserId = interaction.options.get("user")?.user?.id || ""
      const toUserId = interaction.user.id
      const amount = Number(interaction.options.get("amount")?.value) || 0
      const memo = interaction.options.get("memo")?.value || ""

      await interaction.reply({
        content: `<@${toUserId}>さんが <@${fromUserId}> さんに ${amount} ああポイント請求しました。`,
      })
      const message = await interaction.fetchReply()

      const action = new ActionRowBuilder()
        .addComponents([
            new ButtonBuilder()
              .setCustomId(`pay:${message.id}:${fromUserId}:${toUserId}:${amount}:${memo}`)
              .setLabel("払う")
              .setStyle(ButtonStyle.Success)
              .setEmoji("💸")
          ]
        );
      await interaction.editReply({
        content: `<@${fromUserId}> さんが <@${toUserId}> さんに ${amount} ああポイント請求しました。`,
        // @ts-ignore
        components: [action]
      })
    }

    if (interaction.commandName === "earn") {
      if(interaction.user.id !== "170731615524356097") {
        await interaction.reply("ここあ以外このコマンドはうてません　ﾌﾟﾌﾟ")
        return
      }

      const toUserId = interaction.options.get("user")?.user?.id || ""
      const fromUserId = "885834421771567125"
      const amount = Number(interaction.options.get("amount")?.value) || 0
      await sendAAP(fromUserId, toUserId, amount, "admin send")
      await interaction.reply("ok")
      setTimeout(() => {
        interaction.deleteReply()
      }, 1000)
    }

  } else if (interaction.isButton()) {
    const customId = interaction.customId
    const args = customId.split(":")
    if (args[0] === "pay") {
      const messageId = args[1]
      const fromId = args[2]
      const toId = args[3]
      const amount = Number(args[4])
      const memo = args.slice(5).join(":")

      if (interaction.user.id !== fromId) {
        interaction.reply({content: "請求されてません", ephemeral: true})
        return
      }

      const transactionResult = await sendAAP(fromId, toId, amount, memo)
      switch (transactionResult) {
        case SEND_RESULT.USERID_IS_EMPTY:
          await interaction.reply("エラー ますだくんにれんらくしてね (宛先ID null)")
          break
        case SEND_RESULT.NOT_ENOUGH_MONEY:
          const nem = `<@${fromId}> さんが <@${toId}> さんに ${amount} ああポイント送金しようとしましたが、おかねがたりませんでした　ﾌﾟﾌﾟﾌﾟ`
          interaction.reply(nem)
          break
        case SEND_RESULT.UNKNOWN:
          await interaction.reply("エラー ますだくんにれんらくしてね (send ユーザ初期化)")
          break
        case SEND_RESULT.SUCCESS:
          const success = `<@${fromId}> さんが <@${toId}> さんに ${amount} ああポイント送金しました。`
          const channel = await interaction.channel?.fetch()
          const message = await channel?.messages.fetch(messageId)
          if (message?.editable) {
            await message.edit({
              content: `<@${fromId}> さんが <@${toId}> さんに ${amount} ああポイント請求しました。(支払い済み)`,
              components: []
            })
          }
          await interaction.reply(success)
          break
      }
    }
  }
});

async function getNamefromID(id: any) {
  try {
    let g = await client.guilds.fetch(AA_GUILD_ID);
    const member = await g.members.fetch(id)
    let nickName = member?.nickname?.replace("@", "＠");
    if (!nickName) nickName = member?.displayName;
    return nickName;
  } catch {
    return "???"
  }
}

async function getTagFromId(id: any) {
  let g = await client.guilds.fetch(AA_GUILD_ID);
  const member = await g.members.fetch(id)
  return member?.user.username + "#" + member?.user.discriminator;
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

function interactionReplyAndDelete(interaction: CommandInteraction, message: string, time: number) {
  interaction.reply({
    content: message,
    fetchReply: true
  }).then((r) => {
    setTimeout(async () => {
      if ((r as Message).deletable) {
        await (r as Message).delete()
      }
    }, time)
  })
}

client.login(discord_token);
