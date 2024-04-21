import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import users from '../users.json';

// Load environment variables
dotenv.config();

// Create an express app
const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// This should be securely stored, possibly as an environment variable
const secretKey = process.env['secretKey']!;

// Allow requests only from whitelisted origins
const whitelist = ['http://localhost:3000'];
const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',

  auth: {
    user: process.env['transporter_user'],
    pass: process.env['transporter_pass']
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req: any, res: any, next: any) {
  const token = req.headers['authorization'];

  // console.log(token);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, secretKey, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  });
}

// index page
app.get('/email', function (_req, res) {
  res.render('../public/index');
});

// index page
app.get('/', function (_req, res) {
  res.render('../public/login');
});

// Login route to issue JWT token
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  // Example: You should verify the email and password against your database
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });

  return res.json({ token });
});

// index page
app.post('/send-email', authenticateToken, function (req, res) {
  const body: {
    email: string;
    message: string;
    subject: string;
  } = req.body;

  if (!body.email || !body.message || !body.subject) {
    console.log('Please provide all required fields');

    res.status(400).send({ error: 'Please provide all required fields' });
    return;
  }

  // Setup email data
  let mailOptions = {
    from: process.env['mailOptions_from'],
    to: body.email,
    subject: body.subject,
    text: body.message
  };

  // Send email
  transporter.sendMail(mailOptions, (error: any, info: any) => {
    if (error) {
      res.status(500).send({ error: 'Something went wrong' });
      console.log('Error occurred:', error);
    } else {
      res.status(200).send({ error: 'Email sent successfully' });
      console.log('Email sent:', info.response);
    }
  });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
