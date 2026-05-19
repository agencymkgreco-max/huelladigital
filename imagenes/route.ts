import {
  createIncomeTransaction,
  listRecentSales,
  listSalesByPatient,
  listDebtsByPatient,
  createPaymentTransaction,
} from "@/lib/clinic-data";
import { logAuditEvent } from "@/lib/audit";
import { getSession } from "@/lib/auth";

type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";

const VALID_METHODS: PaymentMethod[] = ["Efectivo", "Tarjeta", "Transferencia", "Otro"];

export async function GET(request: Request) {
  // ... (mantener igual o con pequeñas mejoras si quieres)
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "No autorizado." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      paciente_id?: number;
      paciente?: number | string;
      total?: number | string;
      monto_pagado?: number | string;
      metodo_pago?: PaymentMethod;
      notas?: string;
      items?: Array<{ nombre?: string; precio?: number | string }>;
      transaccion_id?: number;
      cita_id?: number;           // ← Preparado para futuro
    };

    const pacienteId = Number(body.paciente_id || body.paciente);
    const metodoPago: PaymentMethod = VALID_METHODS.includes(body.metodo_pago as PaymentMethod)
      ? (body.metodo_pago as PaymentMethod)
      : "Efectivo";

    // ====================== CASO 1: ABONO ======================
    if (body.transaccion_id && body.monto_pagado !== undefined) {
      if (!pacienteId || isNaN(pacienteId)) {
        return Response.json({ error: "Paciente inválido para abono" }, { status: 400 });
      }

      const montoAbono = Number(body.monto_pagado);
      if (isNaN(montoAbono) || montoAbono <= 0) {
        return Response.json({ error: "El monto del abono debe ser mayor a cero" }, { status: 400 });
      }

      const id = await createPaymentTransaction({
        transaccionOriginalId: body.transaccion_id,
        pacienteId,
        usuarioId: session.userId,
        montoAbono,
        metodoPago,
        notas: body.notas,
      });

      await logAuditEvent({ /* ... */ });

      return Response.json({ ok: true, id });
    }

    // ====================== CASO 2: NUEVO COBRO ======================
    if (!pacienteId || isNaN(pacienteId)) {
      return Response.json({ error: "Se requiere un paciente válido" }, { status: 400 });
    }

    // Validar y recalcular total desde los items (más seguro)
    let calculatedTotal = 0;
    const validatedItems: Array<{ nombre: string; precio: number }> = [];

    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      for (const item of body.items) {
        const nombre = item.nombre?.trim();
        const precio = Number(item.precio);

        if (!nombre) continue;
        if (isNaN(precio) || precio <= 0) {
          return Response.json({ 
            error: `Item inválido: "${nombre}" - precio debe ser mayor a cero` 
          }, { status: 400 });
        }

        validatedItems.push({ nombre, precio });
        calculatedTotal += precio;
      }
    }

    // Si no hay items válidos, usar total enviado (pero con validación fuerte)
    if (validatedItems.length === 0) {
      const totalEnviado = Number(body.total);
      if (isNaN(totalEnviado) || totalEnviado <= 0) {
        return Response.json({ error: "Debe agregar al menos un servicio o indicar un total válido" }, { status: 400 });
      }
      calculatedTotal = totalEnviado;
    }

    const montoPagado = Number(body.monto_pagado);
    if (isNaN(montoPagado) || montoPagado <= 0) {
      return Response.json({ error: "El monto pagado debe ser mayor a cero" }, { status: 400 });
    }
    if (montoPagado > calculatedTotal) {
      return Response.json({ error: "El monto pagado no puede superar el total" }, { status: 400 });
    }

    const concepto = validatedItems.length > 0
      ? validatedItems.map(i => i.nombre).join(", ")
      : (body.items?.[0]?.nombre?.trim() || "Cobro general");

    // Determinar estado de pago
    const estadoPago = montoPagado >= calculatedTotal ? "pagado" : "pendiente";

    const id = await createIncomeTransaction({
      pacienteId,
      usuarioId: session.userId,
      monto: calculatedTotal,
      montoPagado,
      metodoPago,
      concepto,
      notas: body.notas?.trim() || null,
      cita_id: body.cita_id ? Number(body.cita_id) : undefined,   // ← Preparado
      estado_pago: estadoPago,                                    // ← Nuevo
    });

    await logAuditEvent({
      userId: session.userId,
      userEmail: session.email,
      role: session.role,
      modulo: "caja",
      accion: "registrar_cobro",
      entidad: "transacciones",
      entidadId: id,
      detalles: {
        paciente_id: pacienteId,
        total: calculatedTotal,
        monto_pagado: montoPagado,
        saldo_pendiente: calculatedTotal - montoPagado,
        metodo_pago: metodoPago,
        items_count: validatedItems.length,
        estado_pago: estadoPago,
        cita_id: body.cita_id,
      },
    });

    return Response.json({
      ok: true,
      id,
      ticket: {
        id,
        paciente_id: pacienteId,
        concepto,
        total: calculatedTotal,
        monto_pagado: montoPagado,
        saldo_pendiente: calculatedTotal - montoPagado,
        metodo_pago: metodoPago,
        estado_pago: estadoPago,
        fecha: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error processing sale/payment:", error);
    return Response.json({ error: "Error interno al registrar el cobro" }, { status: 500 });
  }
}
