

const express=require('express');
const mysql=require('mysql2');
const cors=require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { url } = require('inspector');

const saltRounds = 10;

const app=express();

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'datapro2025@gmail.com', 
    pass: 'smcl ifcd tmkt rrik' 
  }
});

// const dbConfig = {
//   host: 'localhost',
//   user: 'root',
//   password: '',
//   database: 'datapro'
// };
// const db = mysql.createConnection(dbConfig);
const dbConfig = {
  host: 'database-2.c3ewq4ecyodj.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: '5eRGcCIlvbdersAdfa3g',
  database: 'DST',
  Port:'3306',
  connectTimeout: 30000
  
};

const db = mysql.createPool(dbConfig);
const createTables = () => {
  const userTableQuery = `
    CREATE TABLE IF NOT EXISTS user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      password VARCHAR(255) NOT NULL,
      confirm_password VARCHAR(255) NOT NULL,
      graduation VARCHAR(255) NOT NULL,
      branch_name VARCHAR(255) NOT NULL,
      college_name VARCHAR(255) NOT NULL,
      mode VARCHAR(50) NOT NULL,
      gender VARCHAR(10) NOT NULL,
      address TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'student',
      hall_ticket_number VARCHAR(255) UNIQUE NOT NULL
    );
  `;

  

  

  const examResponsesTableQuery = `
    CREATE TABLE IF NOT EXISTS exam_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      exam_id VARCHAR(255) NOT NULL,
      score INT NOT NULL
    );
  `;

  const branchesTableQuery =`
  CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branchName VARCHAR(255) NOT NULL,
  managerEmail VARCHAR(255) NOT NULL
);`
  db.query(userTableQuery, (err) => {
    if (err) {
      console.error('Error creating user table:', err);
    } else {
      console.log('User table created or already exists');
    }
  });


  db.query(examResponsesTableQuery, (err) => {
    if (err) {
      console.error('Error creating exam_responses table:', err);
    } else {
      console.log('Exam responses table created or already exists');
    }
  });
  db.query(branchesTableQuery, (err) => {
    if (err) {
      console.error('Error creating branches table:', err);
    } else {
      console.log('Branches table created or already exists');
    }
  });
};


createTables();

const getBranchManagerEmail = (examCenter) => {
  console.log(examCenter)
  return new Promise((resolve, reject) => {
    db.query('SELECT managerEmail FROM branches WHERE branchName = ?', [examCenter], (err, results) => {
      if (err) {
        console.error('Failed to get branch manager email: ' + err.stack);
        return reject(err);
      }

      if (results.length > 0) {
        console.log(results)
        resolve(results[0].managerEmail);
      } else {
        resolve(null); 
      }
    });
  });
};


const insertAdminDetails = () => {
  const adminDetails = {
    firstName: 'Admin',
    lastName: 'User',
    email: 'datapro@gmail.com',
    phoneNumber: '1234567890',
    password: 'Datapro@123$',
    graduation: 'N/A',
    branchName: 'N/A',
    mode: 'Online',
    examCenter: 'N/A',
    collegeName: 'N/A',
    gender: 'Other',
    address: '123 Admin St',
    role: 'admin'
  };


  db.query('SELECT * FROM user WHERE email = ?', [adminDetails.email], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return;
    }

    if (results.length === 0) {
      // Hash the admin password
      bcrypt.hash(adminDetails.password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return;
        }

        const hallTicketNumber = `DTS${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

        
        const query = `INSERT INTO user (first_name, last_name, email, phone_number, password, confirm_password, graduation, branch_name, mode, exam_center,college_name, gender, address, role, hall_ticket_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;
        db.query(query, [
          adminDetails.firstName,
          adminDetails.lastName,
          adminDetails.email,
          adminDetails.phoneNumber,
          hashedPassword,
          adminDetails.graduation,
          adminDetails.branchName,
          adminDetails.collegeName,
          adminDetails.mode,
          adminDetails.examCenter,
          adminDetails.gender,
          adminDetails.address,
          adminDetails.role,
          hallTicketNumber 
        ], (err) => {
          if (err) {
            console.error('Error inserting admin details:', err);
            return;
          }
          console.log('Admin details inserted successfully.');
        });
      });
    } else {
      console.log('Admin already exists.');
    }
  });
};

insertAdminDetails();


app.post('/register', async (req, res) => {
  const { firstName, lastName, email, phoneNumber, password, confirmPassword, graduation, branchName, collegeName, mode, examCenter, gender, address, role } = req.body;

  
  if (!firstName || !lastName || !email || !phoneNumber || !password || !confirmPassword || !graduation || !branchName  || !collegeName || !mode || !gender) {
    return res.status(400).send('All fields are required except address, which can be optional');
  }


  if (!/^\d{10}$/.test(phoneNumber)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
  }

  try {
  
    const [existingUsers] = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM user WHERE phone_number = ? OR email = ?', [phoneNumber, email], (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Phone number or email is already registered' });
    }

    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const finalExamCenter = mode === 'online' ? null : examCenter;

  
    const hallTicketNumber = `DST${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

  
    const newUser = {
      firstName,
      lastName,
      email,
      phoneNumber,
      password: hashedPassword,
      graduation,
      branchName,
      collegeName,
      mode,
      examCenter: finalExamCenter,
      gender,
      address,
      role: role || 'student',
      hallTicketNumber
    };


    const query = `INSERT INTO user (first_name, last_name, email, phone_number, password, graduation, branch_name, college_name, mode,address,exam_center,gender,address,role, hall_ticket_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await new Promise((resolve, reject) => {
      db.query(query, Object.values(newUser), (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    const studentMailOptions = {
      from: 'datapro2526@gmail.com',
      to: email,
      subject: 'Your Registration is Successful',
      text: `Dear ${firstName},\n\nYour registration is successful. Your hall ticket number is ${hallTicketNumber}.\n\nBest regards,\nDatapro Team`,
    };

    await transporter.sendMail(studentMailOptions);

    // Send email to the branch manager
    const branchManagerEmail = await getBranchManagerEmail(examCenter);
    if (branchManagerEmail) {
      const branchMailOptions = {
        from:'datapro2526@gmail.com',
        to: branchManagerEmail,
        subject: 'New Student Registered',
        text: `Dear Branch Manager,\n\nA new student has registered with the following details:\nName: ${firstName} ${lastName}\nEmail: ${email}\nPhone Number: ${phoneNumber}\\nCollege:${collegeName}\nBranch: ${branchName}\n\nBest regards,\nDatapro Team`
      };

      await transporter.sendMail(branchMailOptions);
    }

    res.status(201).send('User registered successfully and emails sent');
  } catch (error) {
    console.error('Error in registration process:', error);
    res.status(500).send('Registration failed');
  }
}); 

app.get('/branches', (req, res) => {
  db.query('SELECT branchName FROM branches', (err, results) => {
    if (err) {
      console.error('Failed to get branches: ' + err.stack);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(results);
  });
});


const JWT_SECRET = 'your_jwt_secret_key'; // Use a strong secret key

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM user WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ loginStatus: false, Error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ loginStatus: false, Error: 'Invalid email or password' });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({ loginStatus: false, Error: 'Server error' });
      }

      if (!isMatch) {
        return res.status(401).json({ loginStatus: false, Error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { role: user.role, id: user.id },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        loginStatus: true,
        role: user.role,
        token: token,
        id: user.id
      });
    });
  });
});


const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected content' });
});
app.post('/add-question', (req, res) => {
    const { question, options, answer, category } = req.body;
  
    const questionQuery = 'INSERT INTO questions (question_text, answer, category) VALUES (?, ?, ?)';
    db.query(questionQuery, [question, answer, category], (err, result) => {
      if (err) {
        res.status(500).send(err);
        return;
      }
  
      const questionId = result.insertId;
  
      const optionQuery = 'INSERT INTO options (question_id, option_text) VALUES ?';
      const optionValues = options.map((option) => [questionId, option]);
      db.query(optionQuery, [optionValues], (err, result) => {
        if (err) {
          res.status(500).send(err);
          return;
        }
  
        res.send('Question, options, answer, and category added successfully!');
      });
    });
  });

app.get('/questions', (req, res) => {
  const query = `
    SELECT q.id as question_id, q.question_text, q.category, o.id as option_id, o.option_text 
    FROM questions q
    LEFT JOIN options o ON q.id = o.question_id
    ORDER BY q.category, q.id
  `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }

    const questions = {};
    results.forEach(row => {
      if (!questions[row.question_id]) {
        questions[row.question_id] = {
          question_id: row.question_id,
          question_text: row.question_text,
          category: row.category,
          options: []
        };
      }
      questions[row.question_id].options.push({ id: row.option_id, text: row.option_text });
    });

    res.json(Object.values(questions));
  });
});

app.post('/check-hallticket', (req, res) => {
  const { hallticketNumber } = req.body;


  if (!hallticketNumber) {
    return res.status(400).json({ error: 'Hallticket number is required' });
  }

  const query = 'SELECT * FROM user WHERE hall_ticket_Number = ?';
  db.query(query, [hallticketNumber], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Server error', details: err.message });
    }
    if (results.length > 0) {
      res.json({ valid: true, student: results[0] });
    } else {
      res.json({ valid: false, error: 'Student not found' });
    }
  });
});


app.get('/student/:id', (req, res) => {
  const studentId = req.params.id;
  
  const query = 'SELECT * FROM user WHERE id = ?';
  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).json({ error: 'Server error', details: err.message });
    }
    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Student not found' });
    }
  });
});

let examApproved = false;

app.get('/exam-status', (req, res) => {
  res.json({ examApproved });
});

app.post('/approve-exam', (req, res) => {
  examApproved = true;
  res.json({ message: 'Exam approved', examApproved });
});

app.post('/disable-exam', (req, res) => {
  examApproved = false;
  res.json({ message: 'Exam disabled', examApproved });
});

app.post('/submit-exam', (req, res) => {
  const { id, exam_id, responses } = req.body;

  if (!id || !responses) {
    return res.status(400).json({ message: 'Missing required fields: id or responses' });
  }

  
  let parsedResponses;
  try {
    parsedResponses = JSON.parse(responses);
  } catch (error) {
    return res.status(400).json({ message: 'Invalid responses format' });
  }

  
  const query = 'SELECT id, answer FROM questions';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching correct answers:', err);
      return res.status(500).json({ message: 'An error occurred while fetching correct answers', error: err.message });
    }

    
    const correctAnswers = results.reduce((acc, row) => {
      acc[row.id] = row.answer;
      return acc;
    }, {});

    
    let score = 0;
    const detailedResults = Object.keys(parsedResponses).map(questionId => {
      const studentResponse = parsedResponses[questionId];
      const correctAnswer = correctAnswers[questionId];
      const isCorrect = studentResponse === correctAnswer;
      if (isCorrect) score++;
      return {
        question_id: questionId,
        student_response: studentResponse,
        correct_answer: correctAnswer,
        is_correct: isCorrect
      };
    });

    console.log('Detailed results:', detailedResults);
    console.log('Calculated score:', score);

    
    const insertQuery = 'INSERT INTO exam_responses (id, exam_id,score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score)';
    const insertValues = [id, exam_id, score];

    db.query(insertQuery, insertValues, (error, results) => {
      if (error) {
        console.error('Error inserting or updating exam score:', error);
        return res.status(500).json({ message: 'An error occurred while inserting or updating exam score', error: error.message });
      }

      res.status(201).json({ message: 'Exam responses submitted and scored successfully', score: score });
    });
  });
});

app.get('/exam-responses', (req, res) => {

  const query = `
    SELECT 
      er.id AS response_id,
      u.first_name,
      u.college_name,
      u.email,
      u.phone_number,
      u.hall_ticket_number,
      er.score,
      er.exam_id
    FROM 
      exam_responses er
    JOIN 
      user u ON er.id = u.id
  `;
  
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error executing query:', err);
          return res.status(500).send('Internal Server Error');
      }
      res.json(results);
  });
});
app.get('/students/count', (req, res) => {
  db.query('SELECT COUNT(*) AS count FROM user', (err, results) => {
      if (err) {
          console.error('Error fetching student count:', err);
          res.status(500).json({ error: 'Failed to get student count' });
          return;
      }
      res.json({ count: results[0].count });
  });
});

app.get('/admin/branches', (req, res) => {
  db.query('SELECT * FROM branches', (err, results) => {
    if (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ error: 'Failed to fetch branches' });
      return;
    }
    res.json(results);
  });
});

// Add a new branch
app.post('/admin/branches', (req, res) => {
  const { branchName, managerEmail } = req.body;
  const query = 'INSERT INTO branches (branchName, managerEmail) VALUES (?, ?)';
  db.query(query, [branchName, managerEmail], (err, results) => {
    if (err) {
      console.error('Error adding branch:', err);
      res.status(500).json({ error: 'Failed to add branch' });
      return;
    }
    res.status(201).json({ id: results.insertId, branchName, managerEmail });
  });
});

// Update a branch
app.put('/admin/branches/:id', (req, res) => {
  const { id } = req.params;
  const { branchName, managerEmail } = req.body;
  const query = 'UPDATE branches SET branchName = ?, managerEmail = ? WHERE id = ?';
  db.query(query, [branchName, managerEmail, id], (err) => {
    if (err) {
      console.error('Error updating branch:', err);
      res.status(500).json({ error: 'Failed to update branch' });
      return;
    }
    res.status(200).json({ id, branchName, managerEmail });
  });
});

// Delete a branch
app.delete('/admin/branches/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM branches WHERE id = ?';
  db.query(query, [id], (err) => {
    if (err) {
      console.error('Error deleting branch:', err);
      res.status(500).json({ error: 'Failed to delete branch' });
      return;
    }
    res.status(204).send();
  });
});
app.get('/users', (req, res) => {

  db.query('SELECT * FROM user', (err, results) => {
    if (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ error: 'Failed to fetch branches' });
      return;
    }
    console.log(results)
    res.json(results);
  });
});
// Delete user by ID
app.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const connection = await db.promise().getConnection();
    await connection.query('DELETE FROM user WHERE id = ?', [userId]);
    connection.release();
    res.status(200).send('User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user');
  }
});


app.listen(8000,()=>{
    console.log("listening"+8000)
    console.log()
})

 