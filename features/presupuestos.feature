# language: es
Característica: Presupuestos mensuales
  Como usuario
  Quiero ponerle límite a lo que gasto por categoría
  Para no pasarme cada mes

  Antecedentes:
    Dado que inicié sesión

  Escenario: Crear un presupuesto
    Cuando abro "Nuevo Presupuesto"
    Y elijo la categoría "Mercado", un límite mensual de 800.000 y un umbral de alerta de 80
    Y guardo
    Entonces veo el presupuesto "Mercado" con 0% consumido

  Esquema del escenario: Validaciones del presupuesto
    Cuando creo un presupuesto con categoría "<categoria>", límite "<limite>" y umbral "<umbral>"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | categoria | limite  | umbral | mensaje                                              |
      |           | 800000  | 80     | Debes seleccionar una categoría.                     |
      | Mercado   | 0       | 80     | El límite mensual debe ser un número mayor a 0.      |
      | Mercado   | 800000  | 0      | El umbral de alerta debe estar entre 1 y 100.        |
      | Mercado   | 800000  | 150    | El umbral de alerta debe estar entre 1 y 100.        |

  Escenario: Consumo por gastos de la categoría
    Dado que tengo el presupuesto "Mercado" de $800.000
    Cuando registro un gasto de $400.000 en "Mercado"
    Entonces el presupuesto muestra 50% consumido

  Escenario: Registrar un gasto manual en el presupuesto
    Dado que tengo el presupuesto "Mercado"
    Cuando registro un gasto manual de $100.000
    Entonces el consumo aumenta en $100.000

  Escenario: Alerta al superar el umbral
    Dado que tengo el presupuesto "Mercado" de $800.000 con umbral 80
    Cuando el consumo llega a $650.000
    Entonces el presupuesto se marca en alerta

  Escenario: Reinicio al cambiar de mes
    Dado que en octubre consumí $500.000 del presupuesto "Mercado"
    Cuando abro la app en noviembre
    Entonces el presupuesto "Mercado" empieza en 0% consumido

  Escenario: Editar y eliminar un presupuesto
    Dado que tengo el presupuesto "Mercado"
    Cuando cambio el límite a $900.000
    Entonces el presupuesto muestra el nuevo límite
    Cuando lo elimino y confirmo
    Entonces deja de aparecer en la lista
