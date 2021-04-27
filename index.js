const express = require('express');
const app = express();
const port = 8080;
const cors = require('cors');
const bcrypt = require('bcrypt');
const auth = require('./auth');

const User = require('./models/User');
const Post = require('./models/Post');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/mediumDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());
app.use(express.json());

//////// USER
app.post('/register', (req, res) => {
  bcrypt.hash(req.body.password, 10).then(hashedPW => {
    let newUser = new User();
    newUser.username = req.body.username;
    newUser.email = req.body.email;
    newUser.password = hashedPW;
    newUser
    .save()
    .then(data => res.send(data))
    .catch(err => {
      res.status(400).json({
        status: 'fail',
      });
    });
  }).catch(err => {
    res.status(400).json({
      status: 'fail',
    });
  });
});


app.post('/login', (req, res) => {
  User.findOne({ username: req.body.username }).then(user => {
    if (user) {
      bcrypt
        .compare(req.body.password, user.password)
        .then(match => {
          if (match) {
            let token = auth.createAccessToken(user);
            res.status(200).json({
              status: 'success',
              data: {user, token}
            });
          } else {
            res.status(400).json({
              status: 'fail',
            });
          }
        });
    } else {
      res.status(400).json({
        status: 'fail',
      });
    }
  });
});


app.get('/posts', auth.verify, (req, res) => {
  Post.find()
    .populate('user_id') 
    .populate({
      path: 'likes', 
      populate: {
        path: '_id',
        model: 'User'
      }
    })
    .populate({
      path: 'comments',
      populate: {
        path: 'likes',
        populate: {
          path: '_id',
          model: 'User'
        }
      }
    })
    .populate('comments.user')
    .then(data => {
      res.status(200).json({
        status: 'success',
        results: data.length,
        data
      });
    });
});

app.get('/user/:_id/posts', auth.verify, (req, res) => {
  Post.find({user_id: req.params._id})
  .populate({
    path: 'likes',
    populate: {
      path: '_id',
      model: 'User'
    }
  })
  .populate({
    path: 'comments',
    populate: {
      path: 'likes',
      populate: {
        path: '_id',
        model: 'User'
      }
    }
  })
  .populate('comments.user') 
  .then(data => {
    res.status(200).json({
      status: 'success',
      results: data.length,
      data
    });
  });
});


app.post('/posts', auth.verify, (req, res) => {
  let newPost = new Post(req.body);
  newPost.save().then(post =>
    User.findById(req.body.user_id).then(user => {
      user.posts.push(post._id);
      user.save().then(user => {
        res.status(200).json({
          status: 'success',
          data: post
        });
      });
    })
  );
});

//LIKE
app.patch('/posts/:_id', auth.verify, (req, res) => {
  // console.log(req.body);
  if(mongoose.Types.ObjectId.isValid(req.body.user_id)){
  //check if user id is valid. If valid, get the user's document

    User.findOne({ _id: req.body.user_id })
    .then(user => {
      //check if user exists
      if(user !== null){
        //if user exists, check the queried post if it's liked by the user 
        Post.findOne({
          _id: req.params._id,
          likes: { $in: [user]}
        })
        .then(post => {
          //if post exists (meaning the user has liked it before), then unlike
          if(post !== null){
            post.likes.pull(req.body.user_id);
            post.save()
            .then(data => {
              res.status(200).json({
                status: 'success',
                data
              })
            });
          } else {
          //if post doesn't exist (meaing the user has not liked it before), then like
            Post.findOne({_id: req.params._id})
            .then(post => {
              post.likes.push(req.body.user_id);
              post.save()
              .then(data => {
                res.status(200).json({
                  status: 'success',
                  data
                })
              });
            });
          }
        });
      } else {
        res.status(400).json({
          status: 'fail',
        });
      }
    });
  } else {
    res.status(400).json({
      status: 'fail',
    });
  }
})


app.delete('/posts/:_id', auth.isOwner, (req, res) => {
  Post.findByIdAndDelete(req.params._id, {
    useFindAndModify: false
  }).then(post => {
    User.findById(post.user_id).then(user => {
      user.posts = user.posts.filter(id => id.toString() !== req.params._id);
      user.save()
      .then(data => {
        res.status(200).json({
          status: 'success',
        })
      });
    });
  });
});

//COMMENT
app.post('/posts/:_id/comment', auth.verify, (req, res) => {
  Post.findById(req.params._id).then(post => {
    post.comments.push({
      content: req.body.content,
      user: req.body.user_id
    });
    post.save()
    .then(data => {
      res.status(200).json({
        status: 'success',
        data
      })
    });
  });
});

app.patch('/posts/:post_id/comment/:comment_id', auth.verify, (req, res) => {
  Post.findById(req.params.post_id).then(post => {
    //check the comments array 
    //see if the user has liked it
    const comment = getComment(post.comments, req.params.comment_id);
    // console.log(comment);
    const indexComment = getIndexComment(post.comments, req.params.comment_id);
    const indexLike = getIndexLike(comment[0].likes, req.body.user_id);

    if(indexLike === -1){
      //if user doesn't exist in likes (meaning it has not been liked), push the user
      post.comments[indexComment].likes.push(req.body.user_id);
      post.save()
      .then(post => res.send(post));
    } else {
      //otherwise, pull from likes 
      post.comments[indexComment].likes.pull(req.body.user_id);
      post.save()
      .then(data => {
        res.status(200).json({
          status: 'success',
          data
        })
      });
    }
  });

})


app.listen(port, () => console.log(`App running on port ${port}`));



///HELPER
function getComment (commentsArray, commentId) {
  const comment = commentsArray.filter(comment => {
    return comment._id == commentId;
  });
  return comment;
}

function checkIfLiked (likesArray, userId) {
  const user = likesArray.filter(like => {
    return like.user == userId; 
  });

  if (user.length > 1) {
    return true;
  } else {
    return false;
  }
}

function getIndexComment (commentsArray, commentId) {
  const index = commentsArray.findIndex((comment) => {
    return comment._id == commentId;
    
  });

  return index;
}

function getIndexLike (likesArray, userId) {
  const index = likesArray.findIndex((like) => {
    return like._id == userId;
    
  });

  return index;
}