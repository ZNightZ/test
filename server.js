const express = require('express');
const app = express();
const port = 3800;
const mysql = require('mysql');
const { format } = require('date-fns');
var path = require('path');
const bodyParser = require('body-parser');
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'student_attendance'
});
// ----------------- CHECK CONNECTION STATUS ----------------- //
connection.connect(function (err) {
    if (err) {
        return console.error('error: ' + err.message);
    }
    console.log('Connected to the MySQL server');
    console.log("-------------------------------");
});
app.listen(port, function () {
    console.log("-------------------------------");
    console.log("Server at port " + port);
    console.log("-------------------------------");
});
// ----------------------------------------------------------- //
// ----------------- GET ROUTES START ----------------- //
app.get("/attendance", function(req, res){
    res.sendFile(__dirname + "/test/views/attendance.html");
});
app.get("/course", function(req, res){
    res.sendFile(__dirname + "/test/views/course.html");
});
app.get("/studentattendant", function(req, res){
    res.sendFile(__dirname + "/test/views/studentattendant.html");
});
// ----------------- GET ROUTES END ------------------- //
// --------------------------------------------------------------------------------------------------------------- //
// ----------------- RASPBERRY PI START ------------------- //
app.post("/get", function (req, res) {
    // ==> Check a Match of Course, DateTime, and Student by cardNum
    let today = new Date();
    let day = weekday[today.getDay()];
    let cardNum = req.body.cardNum;
    let sql = "SELECT week.*, course.courseDay, student.cardNum FROM ((week INNER JOIN student ON week.studentID = student.studentID) INNER JOIN course ON week.courseID = course.courseID) WHERE course.courseDay = ? AND (CURTIME() BETWEEN course.startCourse AND course.finishCourse) AND (CURDATE() BETWEEN week.startWeek AND week.finishWeek) AND student.cardNum = ?";
    connection.query(sql, [day, cardNum], function (err, result, fields) {
        console.log(day + ' ' + today + 1);
        console.log("-------------------------------");
        if (err) {
            console.log(err);
            console.log("-------------------------------");
            res.sendStatus(400);
        }
        if (result.length != 1) {
            console.log("No Match Class Found in This Time!");
            console.log(cardNum);
            console.log("-------------------------------");
            res.status(404).send("Sorry, No data found in the database.");
        }
        else {
            // ==> Update StudentStatus by matching a cardNum, studentID, and weekID
            let weekID = result[0].weekID;
            let studentID = result[0].studentID;
            let sql_updateStatus = "UPDATE week INNER JOIN student ON week.studentID = student.studentID SET week.studentStatus = 1 WHERE student.cardNum = ? AND week.studentID = ? AND week.weekID = ?";
            connection.query(sql_updateStatus, [cardNum, studentID, weekID], function (err, result, fields) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.status(200).send("Student status has been updated.");
                    console.log("Student status has been updated.");
                    console.log("-------------------------------");
                }
                })
        }
    })
});
// ----------------- RASPBERRY PI END --------------------- //
// --------------------------------------------------------------------------------------------------------------- //
// ----------------- WEB ADMIN START ------------------- //
// ==> Login
app.post("/login", function(req, res){
    let username = req.body.username;
    let password = req.body.password;
    let sql = "SELECT * FROM admin WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], function(err, result, fields){
        if(err){
            res.sendStatus(400);
            console.log(err);
            console.log("-------------------------------");
        }
        if(result.length != 1){
            res.status(405).send("Wrong username or password!.");
            console.log("No data found in database");
            console.log("-------------------------------");
        }
        else{
            res.sendStatus(200);
            console.log("Username: "+ result.data[0].username);
            console.log("-------------------------------");
        }
    });
});

// ==> Get Course by year and semester
app.get("/course/:year/:semester", function(req, res){
    
})

// ----------------- WEB ADMIN END --------------------- //