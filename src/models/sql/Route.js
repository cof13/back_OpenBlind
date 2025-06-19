const { getConnection } = require("../../config/database.sql")

class Route {
  static async create(routeData) {
    const connection = getConnection()
    const { name, location, transport_name, user_id } = routeData

    const [result] = await connection.execute(
      "INSERT INTO routes (name, location, transport_name, user_id) VALUES (?, ?, ?, ?)",
      [name, location, transport_name, user_id],
    )

    return result.insertId
  }

  static async findAll(page = 1, limit = 10, userId = null) {
    const connection = getConnection()
    const offset = (page - 1) * limit

    let query = "SELECT * FROM routes WHERE active = true"
    let countQuery = "SELECT COUNT(*) as total FROM routes WHERE active = true"
    const params = []
    const countParams = []

    if (userId) {
      query += " AND user_id = ?"
      countQuery += " AND user_id = ?"
      params.push(userId)
      countParams.push(userId)
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.push(limit, offset)

    const [rows] = await connection.execute(query, params)
    const [countResult] = await connection.execute(countQuery, countParams)

    return {
      routes: rows,
      total: countResult[0].total,
    }
  }

  static async findById(id) {
    const connection = getConnection()

    const [rows] = await connection.execute("SELECT * FROM routes WHERE id = ? AND active = true", [id])

    return rows.length > 0 ? rows[0] : null
  }

  static async update(id, routeData) {
    const connection = getConnection()
    const updates = []
    const values = []

    if (routeData.name) {
      updates.push("name = ?")
      values.push(routeData.name)
    }

    if (routeData.location) {
      updates.push("location = ?")
      values.push(routeData.location)
    }

    if (routeData.transport_name) {
      updates.push("transport_name = ?")
      values.push(routeData.transport_name)
    }

    values.push(id)

    const [result] = await connection.execute(`UPDATE routes SET ${updates.join(", ")} WHERE id = ?`, values)

    return result.affectedRows > 0
  }

  static async delete(id) {
    const connection = getConnection()

    const [result] = await connection.execute("UPDATE routes SET active = false WHERE id = ?", [id])

    return result.affectedRows > 0
  }
}

module.exports = Route
