const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const url = "";
const client = new MongoClient(url);
const db = client.db("sample_mflix");
const users = "users";
const exercises = "exercises";

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (_, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", express.json(), async (req, res) => {
  const username = req.body.username;
  if (!username) {
    res.json({ error: "username is required" });
  }

  let user = await db.collection(users).findOne({ username });

  if (!!user) {
    res.json({ error: "user is already exists" });
  }

  const created = await db.collection(users).insertOne({ username });

  const result = await db
    .collection(users)
    .findOne({ _id: created.insertedId });
  res.json(result);
});

app.get("/api/users", async (req, res) => {
  const data = await db.collection(users).find({}).toArray();
  res.json(data);
});

app.post("/api/users/:_id/exercises", express.json(), async (req, res) => {
  const _id = req.params._id;
  const description = req.body.description;
  const duration = parseInt(req.body.duration);
  let date = req.body.date;
  try {
    if (!datePattern.test(date) || !date) {
      throw "Date is not valid";
    }
    date = new Date(date);
  } catch (error) {
    date = new Date();
  }
  const user = await db.collection(users).findOne({ _id: new ObjectId(_id) });

  if (!user) {
    res.json({ error: "user is not able to find" });
  }

  const created = await db
    .collection(exercises)
    .insertOne({ user_id: _id, description, duration, date });

  await db.collection(exercises).findOne({ _id: created.insertedId });
  const result = {
    ...user,
    _id: user._id.toString(),
    description,
    duration,
    date: date.toDateString(),
  };
  res.json(result);
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  const _id = req.params._id;
  const search = {};
  const user = await db.collection(users).findOne({ _id: new ObjectId(_id) });

  if (!user) {
    res.json({ error: "user is not able to find" });
  }

  search.user_id = user._id.toString();
  if (from && datePattern.test(from)) {
    search.date = { ...search.date, $gte: new Date(from) };
  }
  if (to && datePattern.test(to)) {
    search.date = { ...search.date, $lte: new Date(to) };
  }
  let exercisesResult = db.collection(exercises).find(search);
  if (!!limit) {
    exercisesResult = exercisesResult.limit(parseInt(limit));
  }
  exercisesResult = await exercisesResult.toArray();

  const result = {
    ...user,
    _id: user._id.toString(),
    count: exercisesResult.length,
    log: exercisesResult.map((res) => ({
      description: res.description,
      duration: res.duration,
      date: res.date.toDateString(),
    })),
  };
  res.json(result);
});

const listener = app.listen(process.env.PORT || 3000, async () => {
  await client.connect();
  console.log("Connected successfully to server");
  console.log(`Listening on port ${listener.address().port}`);
});
