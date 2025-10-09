## Apartment Dashboard Backend API & Data Model Design

### MongoDB Atlas Collections

#### User (Apartment Account)
```
{
  _id: ObjectId,
  username: String, // Apartment name or shared login
  password: String, // Hashed
}
```

#### Task
```
{
  _id: ObjectId,
  name: String,
  assignedTo: String, // Roommate name (optional)
  frequencyDays: Number,
  lastDone: String, // ISO date
  notes: String,
  pinned: Boolean,
  active: Boolean,
  lastCompleted: String, // ISO date
  lastCompletedBy: String, // Roommate name
  user: ObjectId, // Reference to User (apartment)
}
```

### Express API Endpoints

#### Auth
- POST `/register` { username, password } → create apartment user
- POST `/login` { username, password } → login
- GET `/logout` → logout

#### Tasks
- GET `/tasks` → list all tasks for logged-in user
- POST `/tasks` → create new task
- PUT `/tasks/:id` → update task
- DELETE `/tasks/:id` → delete task

All endpoints require session authentication except `/register` and `/login`.