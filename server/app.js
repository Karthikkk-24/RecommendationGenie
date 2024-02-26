
import cors from 'cors';
import express from 'express';


const app = express();
const port = 3000; 

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});