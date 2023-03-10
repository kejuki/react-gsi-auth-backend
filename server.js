if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require("express")
const app = express()
const session = require("express-session")
const cors = require('cors')
const verify = require('./googleauth')

const USERS = new Map()

app.use(cors({origin: "http://localhost:3000", credentials:true}))
app.use(express.json())
app.use(session({
  secret: "asd",
  resave: false,
  saveUninitialized: false,
}))

function isAuthenticated (req, res, next) {
  if (req.session.authenticated) next()
  else res.json({authenticated: false})
}

async function userExists (req, res, next) {
  const user = await verify(req.body.googleUser.credential)
  if(USERS.get(user.sub)) next()
  else res.json({signup: true})
}

app.get('/auth', isAuthenticated, (req,res) =>{
  res.json({authenticated: true, user: req.session.user})
})

app.post('/login', userExists, async (req, res) => {
  const user = await verify(req.body.googleUser.credential)
  req.session.regenerate((err) => {
    if(err) next(err)
    req.session.user = USERS.get(user.sub)
    req.session.authenticated = true
    req.session.save((err) => {
      if(err) return next(err)
      console.log(`Session created for user ${req.session.user.username}`)
      res.json({authenticated: req.session.authenticated, user: req.session.user})
    })
  })
})  

app.post('/signup', async (req, res) => {
  const user = await verify(req.body.googleUser.credential)
  req.session.regenerate((err) => {
    if(err) next(err)
    //make solution for duplicate usernames
    USERS.set(
      user.sub, 
      {
        id: user.sub,
        username: req.body.username,
        avatar: user.picture,
        role: "user",
        dateCreated: Date.now(),
      }
    )
    req.session.user = USERS.get(user.sub)
    req.session.authenticated = true
    req.session.save((err) => {
      if(err) return next(err)
      console.log(`Account and session created for user ${req.session.user.username}`)
      res.json({authenticated: req.session.authenticated, user: req.session.user})
    })
  })
})

app.get('/logout', function (req, res, next) {
  // logout logic

  // clear the user from the session object and save.
  // this will ensure that re-using the old session id
  // does not have a logged in user
  req.session.user = null
  req.session.authenticated = false
  req.session.save((err) => {
    if (err) next(err)

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.json({authenticated: req.session.authenticated})
    })
  })
})

app.listen(process.env.PORT || 3001 , console.log(`runnin on port ${process.env.PORT}`))