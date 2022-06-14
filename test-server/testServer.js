import express from 'express';
const app = express();
 
const port = 30001;
 
app.get("/", (req, res) => {
   res.status(200).send("Success!");
   /*
  if (Math.random() > 0.5) {
    res.status(200).send("Success!");
  } else {
    res.status(400).send("Failed!");
  }*/
});
 
app.listen(port, () => console.log(`Listening at http://localhost:${port}`));