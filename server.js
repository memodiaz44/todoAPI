const express = require('express');
const auth = require("./auth");
const cors = require("cors"); // Import the cors package
const pool = require('./mysql'); // Import the MySQL connection pool
const PORT = process.env.PORT || 8000;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const app = express();


app.use(cors());

app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});






app.get('/todos', cors(), async (req, res) => {
  try{
    const todos = await pool.query('SELECT * FROM todos')
  
res.json(todos)
  }catch(err){
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });

  }
})

app.post("/todos", async (req, res) => {
  try {
    const { id, user_id, title, date } = req.body;

    // Check if the user exists before adding the task
    const userExists = await pool.query("SELECT * FROM users WHERE id = ?", [user_id]);

    if (userExists.length === 0) {
      return res.status(400).json({ error: "User does not exist" });
    }

    const insertResult = await pool.query(
      "INSERT INTO todos (id, user_id, title, date) VALUES (?, ?, ?, ?)",
      [id, user_id, title, date]
    );

    console.log("Inserted todo ID:", id);

    res.status(201).json({ message: "Todo inserted successfully", todoId: id , date: date});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.get("/todos/:id", async (req, res) => {
  try {
    const todoId = req.params.id;

    // Retrieve the todo with the specified ID
    const [todoResult] = await pool.query("SELECT * FROM todos WHERE id = ?", [todoId]);

    if (todoResult.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    res.json(todoResult[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ...

app.get('/users', async (req, res) => {
  try {
    // Check if an email query parameter is provided
    const email = req.query.email;

    if (email) {
      // If email is provided, filter results by email
      const [usersResult] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      const usersWithTasks = await Promise.all(usersResult.map(async (user) => {
        // Query tasks for each user
        const [tasksResult] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [user.id]);
        user.tasks = tasksResult; // Add tasks to the user object
        return user;
      }));
      console.log(usersWithTasks);
      res.json(usersWithTasks);
    } else {
      // If no email parameter provided, return all users
      const [usersResult] = await pool.query('SELECT * FROM users');
      const usersWithTasks = await Promise.all(usersResult.map(async (user) => {
        // Query tasks for each user
        const [tasksResult] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [user.id]);
        user.tasks = tasksResult; // Add tasks to the user object
        return user;
      }));
      console.log(usersWithTasks);
      res.json(usersWithTasks);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ...



  app.get('/users/:userId/todos', async (req, res) => {
    try {
      const userId = req.params.userId;
  
      // Check if the user exists before fetching todos
      const [userExists] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  
      if (userExists.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Fetch todos for the specified user ID
      const [todos] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [userId]);
  
      res.json(todos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// ...





app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Generate a salt to use for hashing
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);

    // Hash the user's password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new user into the users table with the hashed password
    const [insertResult] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    console.log('Inserted user ID:', insertResult.insertId);
    
    res.status(201).json({ message: 'User registered successfully', userId: insertResult.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/user/login', cors(), async (req, res) => {
  const { email, password } = req.body;

  try {
    // Retrieve the user with the provided email from the database
    const [results] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(401).send({
        message: 'Invalid email or password'
      });
    }

    const user = results[0];

    // Compare the provided password with the stored hashed password
    const passwordCheck = await bcrypt.compare(password, user.password);

    if (!passwordCheck) {
      return res.status(401).send({
        message: 'Invalid email or password'
      });
    }

    // Query tasks for the logged-in user
    const [tasksResult] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [user.id]);
    user.tasks = tasksResult;

    // Generate a JWT token for the user
    const token = jwt.sign(
      {
        userId: user.id,
        userEmail: user.email,
      },
      "RANDOM-TOKEN",
      { expiresIn: '24h' }
    );

    // Send user info along with tasks and token
    res.status(200).send({
      message: 'Login Successful',
      email: user.email,
      name: user.name,
      id: user.id,
      tasks: user.tasks, // Add tasks to the response
      token,
    });
  } catch (error) {
    // Handle database or bcrypt errors
    console.error(error);
    res.status(500).send({
      message: 'Internal Server Error'
    });
  }
});


app.get("/free-endpoint",  async (req, res) => {
  res.json({ message: "You are free to access me anytime" });
});

// authentication endpoint
app.get("/auth-endpoint",auth,  async  (req, res) => {
  try {
    // You can perform any necessary authentication checks here
    // For example, you can verify the user's token

    // Simulate an authenticated response
    res.json({ message: "You are authorized to access me" });
  } catch (error) {
    // Handle authentication errors
    console.error(error);
    res.status(401).json({ message: "Unauthorized" });
  }
});

app.delete('/todos/:id', async (req, res) => {
  try {
    const todoId = req.params.id;

    // Check if the todo exists before attempting to delete
    const [todoResult] = await pool.query("SELECT * FROM todos WHERE id = ?", [todoId]);

    if (todoResult.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    // Delete the todo with the specified ID
    await pool.query("DELETE FROM todos WHERE id = ?", [todoId]);

    res.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.put('/todos/:id', async (req, res) => {
  try {
    const todoId = req.params.id;
    const { title, date } = req.body;

    // Check if the todo exists before attempting to update
    const [todoResult] = await pool.query("SELECT * FROM todos WHERE id = ?", [todoId]);

    if (todoResult.length === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    // Update the todo with the specified ID
    await pool.query("UPDATE todos SET title = ?, date = ? WHERE id = ?", [title, date, todoId]);

    res.json({ message: "Todo updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





app.listen(PORT, () => console.log(`server running on ${PORT}`));
