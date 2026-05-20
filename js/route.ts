import { getSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { cita_id, items } = await request.json();

    if (!cita_id || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: "Faltan datos requeridos (cita_id e items)" }, { status: 400 });
    }

    const results = [];

    for (const item of items) {
      const { inventario_id, cantidad_usada, lote } = item;

      if (!inventario_id || cantidad_usada <= 0) continue;

      // Registrar consumo
      const [result] = await execute(
        `INSERT INTO consumo_insumos 
         (cita_id, inventario_id, lote_id, cantidad, usuario_id) 
         VALUES (?, ?, (SELECT id FROM lotes WHERE inventario_id = ? AND numero_lote = ? LIMIT 1), ?, ?)`,
        [cita_id, inventario_id, inventario_id, lote || null, cantidad_usada, session.userId]
      );

      // Descontar stock
      await execute(
        `UPDATE inventario 
         SET cantidad_actual = cantidad_actual - ? 
         WHERE id = ? AND cantidad_actual >= ?`,
        [cantidad_usada, inventario_id, cantidad_usada]
      );

      results.push({ inventario_id, cantidad_usada });
    }

    await logAuditEvent({
      userId: session.userId,
      modulo: "inventario",
      accion: "consumo",
      entidad: "consumo_insumos",
      entidadId: cita_id,
      detalles: { cita_id, items_count: results.length }
    });

    return Response.json({
      ok: true,
      message: "Consumo registrado y stock actualizado",
      items: results
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: "Error al registrar consumo de insumos" }, { status: 500 });
  }
}
