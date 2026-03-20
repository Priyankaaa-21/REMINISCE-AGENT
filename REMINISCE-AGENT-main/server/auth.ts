import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import MongoStore from "connect-mongodb-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const MongoDBStore = MongoStore(session);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Create MongoDB session store
  const sessionStore = new MongoDBStore({
    uri: process.env.DATABASE_URL!,
    databaseName: process.env.DATABASE_NAME || "reminisce_ai",
    collection: "sessions",
    expires: 1000 * 60 * 60 * 24 * 7, // 7 days
    connectionOptions: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }
  });

  sessionStore.on('error', function(error: Error) {
    console.error('Session store error:', error);
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "reminisce_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: false, // Allow HTTP for localhost
      sameSite: 'lax',
    },
    proxy: false, // Disable proxy mode for localhost
  };

  // Don't set trust proxy for localhost development
  // if (app.get("env") === "production") {
  //   app.set("trust proxy", 1);
  // }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      let caretakerId: number | undefined;
      if (req.body.role === 'patient') {
        const caretakerUsername = req.body.caretakerUsername?.trim();
        
        if (!caretakerUsername || caretakerUsername === "") {
          return res.status(400).json({ message: "Caretaker username is required for patients" });
        }
        
        const caretaker = await storage.getUserByUsername(caretakerUsername);
        if (!caretaker) {
          return res.status(400).json({ message: "The specified Caretaker username does not exist. Please check the spelling and try again." });
        }
        if (caretaker.role !== 'caretaker') {
          return res.status(400).json({ message: "The specified user is not a caretaker." });
        }
        caretakerId = caretaker.id;
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        caretakerId,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
