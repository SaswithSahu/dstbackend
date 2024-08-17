// const express = require('express');
// const mysql = require('mysql2');

// const app = express();
// const port = 3002;

// // Database configuration
// const dbConfig = {
//   host: 'database-2.c3ewq4ecyodj.us-east-1.rds.amazonaws.com',
//   user: 'admin',
//   password: '5eRGcCIlvbdersAdfa3g',
//   database: 'DST',
//   port: '3306',
//   connectTimeout: 30000
// };

// // Create a connection to the database
// const connection = mysql.createConnection(dbConfig);

// // Connect to the database
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to the database:', err);
//     return;
//   }
//   console.log('Connected to the database.');
// });

// // API endpoint to get all user details
// app.get('/', (req, res) => {
//   const query = 'SELECT * FROM user';

//   connection.query(query, (err, results) => {
//     if (err) {
//       console.error('Error fetching user details:', err);
//       return res.status(500).json({ error: 'Failed to fetch user details' });
//     }
//     res.json(results);
//   });
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
