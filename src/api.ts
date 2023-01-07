import express from "express"
import {User} from "./entity/user";
import {client, connection} from "./main";
import {SEND_RESULT, sendAAP, userCheckInit} from "./lib";
import {Transaction} from "./entity/transaction";

const app = express()
app.use(express.json())
const server = app.listen(9989, function () {
  console.log("web server OK")
})


app.post("/", async function (req, res, next) {
  const request = req.body
  if (!request.fromId || !request.toId || !request.amount) {
    res.status(400).json({success: false, message: "bad request"})
    return
  }

  const transactionResult = await sendAAP(request.fromId, request.toId, request.amount, request.memo)
  switch (transactionResult) {
    case SEND_RESULT.FROM_TO_SAME:
      res.status(400).json({success: false, message: "bad request"})
      break
    case SEND_RESULT.INVALID_AMOUNT:
      res.status(400).json({success: false, message: "bad request"})
      break
    case SEND_RESULT.NOT_ENOUGH_MONEY:
      res.status(403).json({success: false, message: "not_enough_money"})
      break
    case SEND_RESULT.UNKNOWN:
      res.status(500).json({success: false, message: "internal server error"})
      break
    case SEND_RESULT.SUCCESS:
      res.json({success: true})
      break
  }
});


app.get("/v2/transaction", async (req, res) => {
  const transactionRepository = await connection?.getRepository(Transaction)
  const allTransaction = await transactionRepository?.find({
    relations: ["fromUser", "toUser"]
  });
  res.send(allTransaction)
})

app.get("/v2/transaction/:id", async (req, res) => {
  const transactionRepository = await connection?.getRepository(Transaction)
  const allTransaction = await transactionRepository?.find({
      where: {
        id: Number(req.params.id)
      },
      relations: ["fromUser", "toUser"]
  });
  res.send(allTransaction)
})

app.get("/v2/user", async (req, res) => {
  const userRepository = await connection?.getRepository(User)
  const allUsers = await userRepository?.find({
    relations: ["sendTransaction", "receiveTransaction"]
  })
  res.send(allUsers)
})

app.get("/v2/user/:userId", async (req, res) => {
  const userRepository = await connection?.getRepository(User)
  const allUsers = await userRepository?.find({
    where: {
      discordId: req.params.userId
    },
    relations: ["sendTransaction", "receiveTransaction"]
  })
  res.send(allUsers)
})


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
