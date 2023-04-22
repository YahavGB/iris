import winston, {format, transports} from 'winston';
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.listen(3001, () => {
  console.log('Server started at http://localhost:3001');
});
