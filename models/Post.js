const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  
  title: String,
  content: String,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  
  likes: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],

  comments: [
    {
      content: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        }
      ]
    }
  ]

});

module.exports = mongoose.model('Post', PostSchema);