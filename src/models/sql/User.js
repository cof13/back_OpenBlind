const { getConnection } = require("../../config/database.sql")
const encryptionService = require("../../services/encryptionService")

class User {
  static async create(userData) {
    const connection = getConnection()
    const { email, password, role = "user" } = userData

    const hashedPassword = encryptionService.hashPassword(password)
    const encryptedEmail = encryptionService.encrypt(email)

    const [result] = await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
      encryptedEmail,
      hashedPassword,
      role,
    ])

    return result.insertId
  }

  static async findByEmail(email) {
    const connection = getConnection()
    const encryptedEmail = encryptionService.encrypt(email)

    const [rows] = await connection.execute("SELECT * FROM users WHERE email = ? AND active = true", [encryptedEmail])

    if (rows.length > 0) {
      const user = rows[0]
      user.email = encryptionService.decrypt(user.email)
      return user
    }

    return null
  }

  static async findById(id) {
    const connection = getConnection()

    const [rows] = await connection.execute("SELECT * FROM users WHERE id = ? AND active = true", [id])

    if (rows.length > 0) {
      const user = rows[0]
      user.email = encryptionService.decrypt(user.email)
      return user
    }

    return null
  }

  static async findAll(page = 1, limit = 10) {
    const connection = getConnection()
    const offset = (page - 1) * limit

    const [rows] = await connection.execute(
      "SELECT id, email, role, active, created_at FROM users WHERE active = true LIMIT ? OFFSET ?",
      [limit, offset],
    )

    const [countResult] = await connection.execute("SELECT COUNT(*) as total FROM users WHERE active = true")

    const users = rows.map((user) => ({
      ...user,
      email: encryptionService.decrypt(user.email),
    }))

    return {
      users,
      total: countResult[0].total,
    }
  }

  static async update(id, userData) {
    const connection = getConnection()
    const updates = []
    const values = []

    if (userData.email) {
      updates.push("email = ?")
      values.push(encryptionService.encrypt(userData.email))
    }

    if (userData.password) {
      updates.push("password = ?")
      values.push(encryptionService.hashPassword(userData.password))
    }

    if (userData.role) {
      updates.push("role = ?")
      values.push(userData.role)
    }

    values.push(id)

    const [result] = await connection.execute(
      `UPDATE users SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
    )

    return result.affectedRows > 0
  }

  static async delete(id) {
    const connection = getConnection()

    const [result] = await connection.execute("UPDATE users SET active = false WHERE id = ?", [id])

    return result.affectedRows > 0
  }
}

module.exports = User
