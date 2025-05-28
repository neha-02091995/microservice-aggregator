// aggregator-service.js
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

const POST_SERVICE_URL = 'http://localhost:3001';
const USER_SERVICE_URL = 'http://localhost:3002';
const COMMENT_SERVICE_URL = 'http://localhost:3003';

app.use(express.json());

app.get('/aggregatedData/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Fetch user data
    const userResponse = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
    const user = userResponse.data.user;

    // Fetch posts for the user
    const postsResponse = await axios.get(`${POST_SERVICE_URL}/posts/${userId}`);
    const posts = postsResponse.data.posts;

    // Fetch comments for the entire user
    const commentsResponse = await axios.get(`${COMMENT_SERVICE_URL}/comments/${userId}`);
    const comments = commentsResponse.data.comments;


    // Map comments to their respective posts
    const postsWithComments = posts.map(post => ({
      ...post,
      comments: comments.filter(comment => comment.post_id === post._id.toString()),
    }));

    // Aggregate data into the user object
    const aggregatedData = {
      user,
      posts: postsWithComments,
    };

    res.json(aggregatedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Aggregator Service running on port ${PORT}`);
});
