// Apartment Dashboard Backend
// Express server with authentication and MongoDB Atlas

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcrypt';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors({
	origin: 'http://127.0.0.1:5500', // Update to your frontend server origin
	credentials: true
}));
app.use(session({
	secret: 'apartment-secret',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// TODO: Replace with your actual MongoDB Atlas URI
mongoose.connect('mongodb+srv://Yoyo:E4rpN1n5UndlW6Kq@dashboard.egkl4rw.mongodb.net/?retryWrites=true&w=majority&appName=Dashboard');

// User schema
const userSchema = new mongoose.Schema({
	username: String,
	password: String
});
const User = mongoose.model('User', userSchema);

passport.use(new LocalStrategy(async (username, password, done) => {
	try {
		const user = await User.findOne({ username });
		if (!user) return done(null, false);
		const match = await bcrypt.compare(password, user.password);
		if (!match) return done(null, false);
		return done(null, user);
	} catch (err) {
		return done(err);
	}
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});

// Auth routes
app.post('/register', async (req, res) => {
	const { username, password } = req.body;
	const hash = await bcrypt.hash(password, 10);
	const user = new User({ username, password: hash });
	await user.save();
	res.json({ success: true });
});
app.post('/login', passport.authenticate('local'), (req, res) => {
	res.json({ success: true });
});
app.get('/logout', (req, res) => {
	req.logout(function(err) {
		if (err) { return res.status(500).json({ success: false, error: err.message }); }
		res.json({ success: true });
	});
});

// Task schema
const taskSchema = new mongoose.Schema({
	name: String,
	assignedTo: String,
	frequencyDays: Number,
	lastDone: String,
	notes: String,
	pinned: Boolean,
	active: Boolean,
	lastCompleted: String,
	lastCompletedBy: String,
	user: String // user id
});
const Task = mongoose.model('Task', taskSchema);

// Task routes
app.get('/tasks', async (req, res) => {
	if (!req.user) return res.status(401).json({ error: 'Not logged in' });
	const tasks = await Task.find({ user: req.user.id });
	res.json(tasks);
});
app.post('/tasks', async (req, res) => {
	if (!req.user) return res.status(401).json({ error: 'Not logged in' });
	const task = new Task({ ...req.body, user: req.user.id });
	await task.save();
	res.json(task);
});
app.put('/tasks/:id', async (req, res) => {
	if (!req.user) return res.status(401).json({ error: 'Not logged in' });
	const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, req.body, { new: true });
	res.json(task);
});
app.delete('/tasks/:id', async (req, res) => {
	if (!req.user) return res.status(401).json({ error: 'Not logged in' });
	await Task.deleteOne({ _id: req.params.id, user: req.user.id });
	res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
