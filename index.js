const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jeu0kz0.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const database_Group_Study_Assignment = await client.db(
      "groupStudyAssignment"
    );
    const user_Collection_Group_Study_Assignment =
      database_Group_Study_Assignment.collection("users");
    const all_Assignment_Collection =
      database_Group_Study_Assignment.collection("allAssignments");
    const all_Assignment_Submit_Collection =
      database_Group_Study_Assignment.collection(
        "allAssignmentsSubmitCollection"
      );
    //get methods
    app.get("/allUsersList", async (req, res) => {
      const response = user_Collection_Group_Study_Assignment.find();
      const usersList = await response.toArray();
      console.log(usersList);
      res.send(usersList);
    });
    app.get("/allAssignment", async (req, res) => {
      const response = all_Assignment_Collection.find();
      const allAssignment = await response.toArray();
      console.log("allassighnment:", allAssignment);
      res.send(allAssignment);
    });
    app.get("/assignmentDetails/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id is :", id);
      const query = { _id: new ObjectId(id) };
      const response = await all_Assignment_Collection.findOne(query);
      res.send(response);
    });

    //post methods
    app.post("/users", async (req, res) => {
      try {
        const data = req.body;
        console.log(data);
        const result = await user_Collection_Group_Study_Assignment.insertOne(
          data
        );

        console.log(
          `A document was inserted with the _id: ${result.insertedId}.and the data is ${data}`
        );

        res.status(201).json({
          success: true,
          message: "User inserted successfully",
          insertedId: result.insertedId,
          data: data,
        });
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({
          success: false,
          message: "Failed to insert user",
          error: error.message,
        });
      }
    });
    app.post("/allAssignments", async (req, res) => {
      const data = req.body;
      console.log(data);

      const result = await all_Assignment_Collection.insertOne(data);
      console.log(
        `A document was inserted with the _id: ${result.insertedId}.and the data is ${result}`
      );
    });
    app.post("/allAssignmentSubmitList", async (req, res) => {
      const data = req.body;
      const query = { assignment_id: data.assignment_id, email: data.email };
      const existingSubmission = await all_Assignment_Submit_Collection.findOne(
        query
      );

      if (existingSubmission) {
        // A matching document already exists, reject the submission
        return res
          .status(400)
          .send({ error: "Submission rejected. Duplicate entry found." });
      }

      const result = await all_Assignment_Submit_Collection.insertOne(data);
      console.log(
        `A document was inserted with the _id: ${result.insertedId}.and the data is ${result}`
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello server");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
