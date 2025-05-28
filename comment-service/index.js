// comment-service.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const PORT = 3003;

mongoose.connect('mongodb://localhost/commentdb', { useNewUrlParser: true, useUnifiedTopology: true })
.then(()=>console.log('Connected to MongoDB'))
.catch(err=>console.log(err))
const Comment = mongoose.model('Comment', { post_id: String, text: String, userId: String });

app.use(bodyParser.json());

// Connect to RabbitMQ
let channel;
amqp.connect({
  protocol: "amqp",
  hostname: "127.0.0.1",
  port: 5672,
  username: "guest",
  password: "guest",
  frameMax: 8192,
}).then((conn) => {
  console.log("connected to rabbitmq")
  return conn.createChannel();
}).then((ch) => {
  channel = ch;
  return channel.assertQueue('comments');
}).catch((err)=>console.log("error in rabbitMQ", err));

app.get('/comments', async (req, res) => {
  const comments = await Comment.find();
  res.json({ comments });
});

app.get('/comments/:userId', async (req, res) => {
  const userId = req.params.userId;
  const comments = await Comment.find({ userId });
  res.json({ comments });
});

app.post('/comments', async (req, res) => {
  const { post_id, text, userId } = req.body;
  const newComment = new Comment({ post_id, text, userId });
  await newComment.save();

  // Notify the Post Service about the new comment directly via RabbitMQ
  channel.sendToQueue('comments', Buffer.from(JSON.stringify(newComment)));

  res.status(201).json(newComment);
});

app.listen(PORT, () => {
  console.log(`Comment Service running on port ${PORT}`);
});

