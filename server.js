const express = require('express');
const app = express();
const port = 3800;
const mysql = require('mysql');
const { format } = require('date-fns');
var path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let sess;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/scripts", express.static(__dirname + "/scripts"));
app.use("/assets", express.static(__dirname + "/assets"));
app.use("/styles", express.static(__dirname + "/styles"));
app.use("/vendor", express.static(__dirname + "/vendor"));
app.use("/fonts", express.static(__dirname + "/fonts"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/js", express.static(__dirname + "/js"));
app.use(session({
    secret: 'mysecretcode'
}));

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
app.get("/attendance/:courseID/:weekNum", function (req, res) {
        res.sendFile(__dirname + "/views/attendance.html");   
});
app.get("/course/:courseID", function (req, res) {
        res.sendFile(__dirname + "/views/course.html");
});
app.get("/home", function (req, res) {
    res.sendFile(__dirname + "/views/home.html");
});
app.get("/", function (req, res) {
        res.sendFile(__dirname + "/views/index.html");
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
app.post("/login", function (req, res) {
    let username = req.body.username;
    let password = req.body.password;
    let sql = "SELECT * FROM admin WHERE username = ? AND password = ?";
    connection.query(sql, [username, password], function (err, result, fields) {
        if (err) {
            res.sendStatus(400);
            console.log(err);
            console.log("-------------------------------");
        }
        if (result.length != 1) {
            res.sendStatus(405);
            console.log("No data found in database");
            console.log("-------------------------------");
        }
        else {
            res.sendStatus(200);
            console.log("Username: " + result[0].username);
            console.log("-------------------------------");
        }
    });
});

// ==> Get Course
app.get("/home/list", function (req, res) {
    let sql = "SELECT DISTINCT course.*, schedule.year, schedule.semester FROM ((week INNER JOIN course ON week.courseID = course.courseID) INNER JOIN schedule ON week.scheduleID = schedule.scheduleID)";
    connection.query(sql, [], function(err, result, fields){
        if(err){
            console.log(err);
            console.log("-------------------------------");
            res.sendStatus(400);
        }
        else{
            res.send(result);
        }
    })
});

// ==> Get course by semester or year
app.get("/home/list/:year/:semester", function(req, res){
    let year = req.params.year;
    let semester = req.params.semester;
    let sql = "SELECT DISTINCT course.*, schedule.year, schedule.semester FROM ((week INNER JOIN course ON week.courseID = course.courseID) INNER JOIN schedule ON week.scheduleID = schedule.scheduleID) WHERE schedule.year = ? AND schedule.semester = ?";
    connection.query(sql, [year, semester], function(err, result, fields){
        if(err){
            console.log(err);
            console.log("-------------------------------");
            res.sendStatus(400);
        }
        else{
            res.send(result);
        }
    })
});

// ==> Get course week by courseID
app.get("/course/get/:courseID", function(req, res){
    let courseID = req.params.courseID;
    let sql = "SELECT DISTINCT week.weekNum, course.courseName FROM week INNER JOIN course ON week.courseID = course.courseID WHERE course.courseID = ?";
    connection.query(sql, [courseID], function(err, result, fields){
        if(err){
            console.log(err);
            console.log("-------------------------------");
            res.sendStatus(400);
        }
        else{
            res.send(result);
        }
    })
});

// ==> Get week attendance by weekNum of courseID
app.get("/attendance/get/:courseID/:weekNum", function(req, res){
    let courseID = req.params.courseID;
    let weekNum = req.params.weekNum;
    let sql = "SELECT DISTINCT week.weekNum, student.studentCode, student.studentName, CASE WHEN week.studentStatus = 0 THEN 'Absent' WHEN week.studentStatus = 1 THEN 'Present' END AS studentStatus, course.courseName, course.courseDay, course.startCourse, course.finishCourse FROM ((week INNER JOIN student ON week.studentID = student.studentID) INNER JOIN course ON week.courseID = course.courseID) WHERE week.weekNum = ? AND course.courseID = ? ORDER BY student.studentCode ASC";
    connection.query(sql, [weekNum, courseID], function(err, result, fields){
        if(err){
            console.log(err);
            console.log("-------------------------------");
            res.sendStatus(400);
        }
        else{
            res.send(result);
        }
    })
});
// ----------------- WEB ADMIN END --------------------- //