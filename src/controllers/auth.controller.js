const Organizer = require('../models/organizer.model');
const { generateToken } = require('../middleware/auth');
const { validateEmail } = require('../utils/validateInput');


exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, organization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const existingOrganizer = await Organizer.findOne({ email });
    if (existingOrganizer) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const organizer = await Organizer.create({
      name,
      email,
      password,
      organization,
    });

    const token = generateToken(organizer._id);

    res.status(201).json({
      success: true,
      token,
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const organizer = await Organizer.findOne({ email }).select('+password');
    if (!organizer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await organizer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(organizer._id);

    res.status(200).json({
      success: true,
      token,
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.getMe = async (req, res, next) => {
  try {
    const organizer = await Organizer.findById(req.organizer._id);

    res.status(200).json({
      success: true,
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        organization: organizer.organization,
      },
    });
  } catch (error) {
    next(error);
  }
};