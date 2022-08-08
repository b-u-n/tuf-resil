import express from 'express';
const app = express();
 
const port = 30001;
 
app.get("/:pass/:id", (req, res) => {
  req.params.pass === '1' ?
   res.status(200).send("Success!") :
   res.status(400).send("Failed!");
});
 
app.listen(port, () => console.log(`Listening at http://localhost:${port}`));