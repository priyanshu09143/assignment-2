import express, { urlencoded } from 'express';
import { Server } from 'socket.io';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from "dotenv"

dotenv.config(
  {
    path: './config.env',
  }
)

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Mongoose Connection
mongoose.connect(process.env.MONGO_URI, { dbName: "FormDatabases" })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

app.use(urlencoded({ extended: true }));

// Mongoose code for Database
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  mobileNo: Number,
  emailId: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
  },
  loginId: String,
  password: String,
  creationTime: Date,
  lastUpdatedOn: Date,
});

// Create the model
const User = mongoose.model('User', userSchema);

const UserData =[]


// Socket.io code
io.on("connection", (socket) => {
  console.log(socket.id);

  // Joining user to 'live room' when data is inserted into MongoDB
  socket.on('join-live-room', ({userId,fullName}) => {
    socket.join('live room');
    const UserInfo ={}
    UserInfo.UserID = userId;
    UserInfo.socketId = socket.id;
    UserInfo.fullName = fullName;
    io.to('live room').emit('user-joined-room', userId);
    console.log(`User ${userId} joined live room`);
    UserData.push(UserInfo)
  });
});

app.get('/users', async (req, res) => {
  const fetchedUsers = [];
  const promises = UserData.map(async (user) => {
    const newUser = await User.findById(user.UserID);
    const UserSocket = {newUser, socketID : user.socketId};
    fetchedUsers.push(UserSocket);
  });

  await Promise.all(promises); // Wait for all promises to resolve

  res.send(fetchedUsers);
});

//   const users = await User.findById({})
//   console.log(users)
//   res.send(UserData);


// Render index.ejs on homepage
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/user',(req,res)=>{
  res.render('ConnectedUser.ejs');
})

// Store data in the database
app.post('/api/users', async (req, res) => {
  const user = new User(req.body);
  const fullName = user.firstName + ' ' + user.lastName;
  const userId = user._id
  user.creationTime = new Date();
  user.lastUpdatedOn = new Date();
  await user.save();

  // Emit an event to join 'live room'
  io.emit('join-live-room', {userId ,fullName });

  res.send(user); // Send response
});
// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server is running on port 3000');
});
