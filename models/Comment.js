const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({

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

});

module.exports = mongoose.model('Post', CommentSchema);
