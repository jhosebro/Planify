# language: es
Característica: Cuentas
  Como usuario
  Quiero registrar mis cuentas (efectivo, banco, tarjeta)
  Para conocer mi saldo total

  Antecedentes:
    Dado que inicié sesión

  Escenario: Crear una cuenta
    Cuando voy a Cuentas y pulso "+"
    Y ingreso el nombre "Bancolombia", el tipo y un saldo inicial de 500.000
    Y guardo
    Entonces veo "Bancolombia" con saldo $500.000
    Y el saldo total incluye esa cuenta

  Esquema del escenario: Validaciones de la cuenta
    Cuando creo una cuenta con nombre "<nombre>" y saldo inicial "<saldo>"
    Entonces veo el error "<mensaje>"
    Y la cuenta no se crea

    Ejemplos:
      | nombre      | saldo | mensaje                                         |
      |             | 1000  | El nombre de la cuenta es obligatorio.          |
      | Bancolombia | abc   | El saldo inicial debe ser un número válido.     |

  Escenario: Ver el detalle de una cuenta
    Dado que tengo la cuenta "Bancolombia" con movimientos
    Cuando abro "Bancolombia"
    Entonces veo su saldo y sus movimientos

  Escenario: Archivar una cuenta
    Dado que tengo la cuenta "Nequi"
    Cuando la archivo
    Entonces deja de aparecer entre las cuentas activas
    Y su saldo no suma al saldo total
