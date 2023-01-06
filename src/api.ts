import express from "express"
import {User} from "./entity/user";
import {Transaction} from "./entity/transaction";
import {AA_GUILD_ID, client, connection} from "./main";
import {userCheckInit} from "./lib";

const app = express()
app.use(express.json())
const server = app.listen(9989, function () {
  console.log("web server OK")
})


app.post("/", async function (req, res, next) {
  const request = req.body
  if (!request.fromId || !request.toId || !request.amount) {
    res.json({success: false, message: "bad request"})
    return
  }

  let g = client.guilds.cache.get(AA_GUILD_ID);

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
