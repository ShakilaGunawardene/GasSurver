import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../schema/Admin.js";
import Customer from "../schema/Customer.js";
import SalesAgent from "../schema/SalesAgent.js";

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Try to find user in Admin, Customer, or SalesAgent collections
    const user =
      (await Admin.findOne({ email })) ||
      (await Customer.findOne({ email })) ||
      (await SalesAgent.findOne({ email }));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export { login };
