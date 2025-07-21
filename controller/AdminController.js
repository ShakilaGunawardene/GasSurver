import Admin from '../schema/Admin.js';
import bcrypt from 'bcryptjs';

// Create Admin
const registerAdmin = async (req, res) => {
  const {adminName, email, password } = req.body;

  try {
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Admin already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      adminName,
      email,
      password: hashedPassword,
    });

    await admin.save();
    res.status(201).json({ message: 'Admin registered', admin });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read All Admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Read Admin by ID
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Update Admin
const updateAdmin = async (req, res) => {
  const { adminId, adminName, email, password } = req.body;

  try {
    const updated = await Admin.findByIdAndUpdate(
      req.params.id,
      { adminId, adminName, email, password },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin updated', admin: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

// Delete Admin
const deleteAdmin = async (req, res) => {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Admin not found' });
    res.json({ message: 'Admin deleted', admin: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

export {
  registerAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
};
