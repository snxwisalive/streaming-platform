import {
  hashPassword,
  comparePassword,
  generateToken,
} from "../utils/auth.utils.js";
import {
  findUserByEmailOrNickname,
  createUser,
  findUserByEmail,
  findUserByNickname,
  updateUser,
} from "../db/user.repository.js";

export const register = async (req, res) => {
  try {
    const { nickname, email, password, birthday } = req.body;

    if (!nickname || !email || !password || !birthday) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingByNickname = await findUserByNickname(nickname);
    if (existingByNickname) {
      return res.status(400).json({ message: "Nickname already exists" });
    }

    const passwordHash = await hashPassword(password);

    const user = await createUser({
      email,
      nickname,
      passwordHash,
      birthDate: birthday,
    });

    const token = generateToken({
      user_id: user.user_id,
      nickname: user.nickname,
      email: user.email,
    });

    res.json({
      user: {
        user_id: user.user_id,
        nickname: user.nickname,
        email: user.email,
        birthday: user.birth_date,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Registration failed", error: error.message });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingByEmail = await findUserByEmail(email);
    return res.json({ exists: !!existingByEmail });
  } catch (error) {
    console.error("Check email error:", error);
    res
      .status(500)
      .json({ message: "Failed to check email", error: error.message });
  }
};

export const checkNickname = async (req, res) => {
  try {
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    const existingByNickname = await findUserByNickname(nickname);
    return res.json({ exists: !!existingByNickname });
  } catch (error) {
    console.error("Check nickname error:", error);
    res
      .status(500)
      .json({ message: "Failed to check nickname", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res
        .status(400)
        .json({ message: "Login and password are required" });
    }

    const user = await findUserByEmailOrNickname(login);

    if (!user) {
      return res.status(401).json({ message: "Invalid login or password" });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid login or password" });
    }

    // Deactivation vs deletion rules:
    // 1) Deactivation: is_active=false AND deleted_at IS NULL
    if (user.is_active === false && !user.deleted_at) {
      return res.status(403).json({ error: "account_deactivated" });
    }

    // 2) Deletion: deleted_at is set
    if (user.deleted_at) {
      const now = new Date();
      const scheduledAt = user.deletion_scheduled_at ? new Date(user.deletion_scheduled_at) : null;

      // Grace period: auto-reactivate and return flag.
      if (scheduledAt && scheduledAt.getTime() > now.getTime()) {
        await updateUser(user.user_id, {
          is_active: true,
          deleted_at: null,
          deletion_scheduled_at: null,
        });

        const reactivatedToken = generateToken({
          user_id: user.user_id,
          nickname: user.nickname,
          email: user.email,
        });

        return res.json({
          user: {
            user_id: user.user_id,
            nickname: user.nickname,
            email: user.email,
            birthday: user.birth_date,
          },
          token: reactivatedToken,
          reactivated: true,
        });
      }

      // Outside grace period => irreversible deletion
      return res.status(403).json({ error: "Акаунт було остаточно видалено" });
    }

    const token = generateToken({
      user_id: user.user_id,
      nickname: user.nickname,
      email: user.email,
    });

    res.json({
      user: {
        user_id: user.user_id,
        nickname: user.nickname,
        email: user.email,
        birthday: user.birth_date,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};