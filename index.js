const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const helmet = require("helmet");
var jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        connectSrc: ["'self'", "https://group-study-assignment-a7832.web.app"],
      },
    },
  })
);
// app.set("trust proxy", 1);
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://group-study-assignment-a7832.web.app",
    ],
    credentials: true,
    // exposedHeaders: ["Set-Cookie"]
  })
);
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specified methods
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization'); // Allow specified headers
//   next();
// });
app.use(express.json());
app.use(cookieParser());
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
    const database_Group_Study_Assignment = client.db("groupStudyAssignment");
    const user_Collection_Group_Study_Assignment =
      database_Group_Study_Assignment.collection("users");
    const all_Assignment_Collection =
      database_Group_Study_Assignment.collection("allAssignments");
    const all_Assignment_Submit_Collection =
      database_Group_Study_Assignment.collection(
        "allAssignmentsSubmitCollection"
      );
    const all_Assignment_marks = database_Group_Study_Assignment.collection(
      "allAssignmentsMarks"
    );
    // middleware

    const verifyToken = async (req, res, next) => {
      // console.log("re url: ", req.originalUrl)
      // console.log("inside verify token. req.headers is: ", req.headers);
// 
     
      const token = await req.headers.authorization.split(" ")[1];
      console.log(token.split(" ")[1]);
      if (!token) {
        return res.status(401).send({ message: "Unauthorized.." });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
        if (error) {
          return res.status(401).send({ message: "Invalid Token" });
        }
        if (decode) {
          // console.log("decoded token in middleware: ", decode);
          req.user = decode;
          next();
        }
      });
    };
    //get methods
    app.get("/allUsersList", async (req, res) => {
      const response = user_Collection_Group_Study_Assignment.find();
      const usersList = await response.toArray();
      console.log(usersList);
      res.send(usersList);
    });
    app.get("/allAssignment", async (req, res) => {
      const query = { status: "onGoing" };
      const response = all_Assignment_Collection.find(query);

      const allAssignment = await response.toArray();
      // console.log("allassighnment:", allAssignment);
      res.send(allAssignment);
    });
    app.get("/allAssignmentCompleteList", async (req, res) => {
      const query = { status: "completed" };
      const response = all_Assignment_Collection.find(query);

      const allAssignment = await response.toArray();
      // console.log("allassighnment:", allAssignment);
      res.send(allAssignment);
    });
    app.get("/assignmentDetails/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("id is :", id);
      const query = { _id: new ObjectId(id) };
      const response = await all_Assignment_Collection.findOne(query);
      res.send(response);
    });

    app.get("/submittedAssignment/:id", async (req, res) => {
      try {
        const assignmentid = req.params.id;
        // console.log("id is :", assignmentid);
        const query = { assignment_id: assignmentid };
        const response = all_Assignment_Submit_Collection.find(query);
        const result = await response.toArray(query);
        if (result) {
          res.send(result);
        } else {
          res.status(404).send("No matching documents found");
        }
      } catch (error) {
        console.error("Error fetching submitted assignments:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    app.get("/usersLifeTimeSubmittedList", verifyToken, async (req, res) => {
      console.log("email is is :", req.query.email);
      // console.log("req.query is :", req.query);
      if (req.user.email !== req.query.email) {
        console.log("both email not same, logouting...");
        res.status(403).send({ message: "Unauthorized" });
      } else {
        console.log("verified user at /submittedAssignment/:id.");
      }
      // console.log("req.user is :",req.user)
      const query = { email: req.query.email };
      const result = await all_Assignment_Submit_Collection
        .find(query)
        .toArray();
      // console.log(result)

      res.send(result);
    });

    //post methods
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("email is :", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1hr",
      });
      console.log("token is :", token);

      res.status(200).send({ token: token });
    });
    app.post("/users", async (req, res) => {
      try {
        const data = req.body;
        console.log("user data: ", data);
        const query = { email: data.email };
        const response = await user_Collection_Group_Study_Assignment
          .find(query)
          .toArray();
        console.log("🚀 ~ app.post ~ response:", response);
        if (response.length === 0) {
          const insertRes =
            await user_Collection_Group_Study_Assignment.insertOne(data);
          // console.log(insertRes)
          if (insertRes.insertedId) {
            console.log(`A document was inserted.`);
            res.status(201).json({
              success: true,
              message: "User inserted successfully",
            });
          } else {
            console.log("not inserted");
            res.status(500).json({
              success: true,
              message: "Failed to insert user",
            });
          }
        }
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
      // console.log(
      //   `A document was inserted with the _id: ${result.insertedId}.and the data is ${result}`
      // );
      res.send(result);
    });

    app.post("/marksDetails", async (req, res) => {
      const data = req.body;
      // console.log(data);
      const query = {
        assignment_id: data.assignment_id,
        submitter_email: data.submitter_email,
        grader_email: data.grader_email,
      };
      const existingSubmission = await all_Assignment_marks.findOne(query);
      if (existingSubmission) {
        // A matching document already exists, reject the submission
        return res
          .status(400)
          .send({ error: "Submission rejected. Duplicate entry found." });
      }

      const result = await all_Assignment_marks.insertOne(data);
      // console.log(`A document was inserted with the _id: ${result.insertedId}`);
      res.send(result);
    });
    app.get("/progressStatisticsCheck", async (req, res) => {
      //converting the time into int
      const userCreationTime = parseInt(req.query.userCreationTime, 10);
      console.log(
        "userCreationTime /progressStatisticsCheck:",
        userCreationTime
      );

      const firebaseCreationDate = new Date(userCreationTime);
      // console.log("firebaseCreationDate:", firebaseCreationDate);

      try {
        const docCountAfterCreationUser =
          await all_Assignment_Collection.countDocuments({
            creationDate: { $gt: firebaseCreationDate.toISOString() },
          });

        const assignmentCount =
          await all_Assignment_Collection.countDocuments();
        const totalDocCount = assignmentCount.toString();
        // console.log(
        //   "total doc && doc after creation of user",
        //   totalDocCount,
        //   docCountAfterCreationUser
        // );

        res.send({
          totalDocCount,
          docCountAfterCreationUser: docCountAfterCreationUser.toString(),
        });
      } catch (error) {
        console.error("Error while counting documents:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    // app.get("/progressStatisticsCheck", async (req, res) => {
    //   const userCreationTime = parseInt(req.query.userCreationTime, 10);
    //   console.log(
    //     "userCreationTime /progressStatisticsCheck:",
    //     userCreationTime
    //   );

    //   try {
    //     // Convert userCreationTime to a Date object
    //     const userCreationDate = new Date(userCreationTime);

    //     // Convert each document's creationDate to milliseconds
    //     const docCountAfterCreationUser =
    //       await all_Assignment_Collection.countDocuments({
    //         creationDate: { $gt: userCreationDate.toISOString() },
    //       });

    //     const assignmentCount =
    //       await all_Assignment_Collection.countDocuments();
    //     const totalDocCount = assignmentCount.toString();
    //     console.log(
    //       "total doc && doc after creation of user",
    //       totalDocCount,
    //       docCountAfterCreationUser
    //     );

    //     res.send({
    //       totalDocCount,
    //       docCountAfterCreationUser: docCountAfterCreationUser.toString(),
    //     });
    //   } catch (error) {
    //     console.error("Error while counting documents:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });

    app.post("/emailSend", async (req, res) => {
      const { email, subject, description } = req.body;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "nodemailerbyshan@gmail.com",
          pass: "vkpmllesdutehecz",
        },
      });

      const mailOptions = {
        from: "nodemailerbyshan@gmail.com",
        to: "isaahmedshan190138@gmail.com",
        "Sender Email": email,
        subject: subject,
        text: `This is from${email}.${description}.`,
      };

      try {
        await transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log("send mail failed: " + error);
          } else {
            console.log("send mail success: " + info.response);
          }
        });
        res.status(200).send("Email sent successfully");
      } catch (error) {
        console.error(error);
        res.status(500).send("Error sending email");
      }
    });

    //PATCH METHODS
    app.patch("/allAssignmentsCheck", async (req, res) => {
      const currentDate = new Date();
      const filter = { dueDate: { $lt: currentDate.toISOString() } };
      const updateDoc = {
        $set: {
          status: "completed",
        },
      };
      const result = await all_Assignment_Collection.updateMany(
        filter,
        updateDoc
      );

      res.send(result);
    });
    app.patch("/assignmentUpdate/:id", async (req, res) => {
      const { title, description, marks, difficulty, dueDate, image } =
        req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          title,
          description,
          marks,
          difficulty,
          dueDate,
          image,
        },
      };
      // console.log("id: ", id);
      // console.log("updateDoc: ", updateDoc);
      // console.log("query:", query);
      const result = await all_Assignment_Collection.updateOne(
        query,
        updateDoc
      );
      res.send(result);
    });
    app.patch("/markAddToAssignment", async (req, res) => {
      const { assignment_id, submitter_email, marks } = req.body;
      console.log("mark added data:", assignment_id, submitter_email, marks);
      const filter = {
        assignment_id: assignment_id,
        email: submitter_email,
      };
      const updateDocs = {
        $inc: {
          gettingMark: parseInt(marks, 10) || 0,
          count: 1,
        },
      };
      const result = await all_Assignment_Submit_Collection.updateOne(
        filter,
        updateDocs
      );
      res.send(result);
    });

    //DELETE METHODS
    app.delete("/assignmentDelete/:id", async (req, res) => {
      const id = req.params.id;
      // console.log('id is: ' + id);
      const query = { _id: new ObjectId(id) };
      const result = await all_Assignment_Collection.deleteOne(query);
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
