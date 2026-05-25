const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const AppError = require('../utils/AppError');

class AuthService {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }

  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret_change_me', { expiresIn: '30d' });
  }

  async register({ name, email, password, university, address, role, adminCode }) {
    if (!name || !email || !password) {
      throw new AppError('Name, email and password are required', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) throw new AppError('User already exists', 400);

    const finalRole = role === 'admin' && adminCode === process.env.ADMIN_INVITE_CODE ? 'admin' : 'user';

    const user = await this.userRepository.create({ name, email, password, university, address, role: finalRole });
    return this.buildAuthPayload(user);
  }

  async login({ email, password }) {
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatches) throw new AppError('Invalid credentials', 401);
    return this.buildAuthPayload(user);
  }

  async getProfile(userId) {
    const user = await this.userRepository.findSafeById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId, updates) {
    const allowed = {
      name: updates.name,
      email: updates.email,
      university: updates.university,
      address: updates.address,
      monthlyBudget: updates.monthlyBudget,
    };
    Object.keys(allowed).forEach((key) => allowed[key] === undefined && delete allowed[key]);

    const user = await this.userRepository.updateById(userId, allowed);
    if (!user) throw new AppError('User not found', 404);
    return this.buildAuthPayload(user);
  }

  buildAuthPayload(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      university: user.university || '',
      address: user.address || '',
      token: this.generateToken(user._id),
    };
  }
}

module.exports = AuthService;
