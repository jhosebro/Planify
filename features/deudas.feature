# language: es
Característica: Deudas
  Como usuario
  Quiero registrar lo que debo y lo que me deben
  Para saber cuánto falta por pagar

  Antecedentes:
    Dado que inicié sesión

  Escenario: Registrar una deuda a cuotas
    Cuando abro "Nueva Deuda"
    Y elijo la categoría "Compra a cuotas" y la dirección "Yo debo"
    Y ingreso el nombre "Celular", monto total 1.200.000 y 12 cuotas
    Y guardo
    Entonces veo la deuda con cuota de $100.000 y saldo pendiente de $1.200.000

  Escenario: Registrar una deuda con cuotas ya pagadas
    Cuando registro "Celular" por $1.200.000 en 12 cuotas con 3 cuotas pagadas
    Entonces el saldo pendiente es $900.000

  Escenario: Registrar un préstamo que me deben
    Cuando registro una deuda personal "Préstamo a Juan" de $300.000 con dirección "Me deben"
    Entonces aparece en el resumen de lo que me deben

  Esquema del escenario: Validaciones de la deuda
    Cuando creo una deuda con nombre "<nombre>" y monto "<monto>"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | nombre  | monto | mensaje                         |
      |         | 1000  | El nombre es obligatorio        |
      | Celular | -5    | El monto no puede ser negativo  |

  Escenario: Registrar un pago
    Dado que tengo la deuda "Celular" con saldo pendiente de $900.000
    Cuando registro un pago de $100.000
    Entonces el saldo pendiente es $800.000

  Esquema del escenario: Pagos inválidos
    Dado que tengo la deuda "Celular" con saldo pendiente de $900.000
    Cuando registro un pago de <monto>
    Entonces veo un error que contiene "<mensaje>"

    Ejemplos:
      | monto      | mensaje                            |
      | $0         | El monto debe ser mayor a cero     |
      | $1.000.000 | El pago supera el saldo pendiente  |

  Escenario: No se puede pagar una deuda saldada
    Dado que la deuda "Celular" está pagada
    Cuando intento registrar un pago
    Entonces veo el error "Esta deuda ya está pagada"

  Escenario: Marcar como pagada y eliminar
    Dado que tengo la deuda "Celular"
    Cuando la marco como pagada y confirmo
    Entonces su estado es "pagada"
    Cuando la elimino y confirmo
    Entonces deja de aparecer en la lista

  Escenario: Compras a 1 cuota
    Dado que tengo compras de tarjeta a 1 cuota
    Cuando abro "Compras a 1 Cuota"
    Entonces veo su listado y su total
