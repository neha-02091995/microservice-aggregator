// post-service.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const PORT = 3001;

mongoose.connect('mongodb://localhost', { useNewUrlParser: true, useUnifiedTopology: true });
const Post = mongoose.model('Post', { title: String, content: String, commentCount: Number, userId: String });

let channel;

// Connect to RabbitMQ
amqp.connect({
  protocol: "amqp",
  hostname: "127.0.0.1",
  port: 5672,
  username: "guest",
  password: "guest",
  frameMax: 8192,
}).then((conn) => {
  return conn.createChannel();
}).then((ch) => {
  channel = ch;
  ch.assertQueue('comments');

  // Handle messages from RabbitMQ
  channel.consume('comments', async (msg) => {
    const newComment = JSON.parse(msg.content.toString());

    // Increment the comment count for the corresponding post
    await Post.updateOne({ _id: newComment.post_id }, { $inc: { commentCount: 1 } });

  }, { noAck: true });
}).catch(console.warn);

app.use(bodyParser.json());

app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  console.log(posts)
  res.json({ posts });
});

app.get('/posts/:userId', async (req, res) => {
  const userId = req.params.userId;
  const posts = await Post.find({ userId });
  res.json({ posts });
});

app.post('/posts', async (req, res) => {
  const { title, content, userId } = req.body;
  const newPost = new Post({ title, content, commentCount: 0, userId });
  await newPost.save();
  res.status(201).json(newPost);
});

app.listen(PORT, () => {
  console.log(`Post Service running on port ${PORT}`);
});
