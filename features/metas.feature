# language: es
Característica: Metas de ahorro
  Como usuario
  Quiero definir metas con fecha y costo
  Para ahorrar con un plan

  Antecedentes:
    Dado que inicié sesión

  Escenario: Crear una meta
    Cuando abro "Nueva Meta"
    Y ingreso el nombre "Viaje a Cartagena" y un costo estimado de 3.000.000
    Y elijo prioridad "Alta", tipo "Pareja", frecuencia "Mensual" y una fecha objetivo
    Y pulso "Crear meta"
    Entonces veo la meta con 0% de avance y la cuota sugerida por periodo

  Esquema del escenario: Validaciones de la meta
    Cuando creo una meta con nombre "<nombre>" y costo "<costo>"
    Entonces veo el error "<mensaje>"

    Ejemplos:
      | nombre            | costo   | mensaje                                    |
      |                   | 3000000 | El nombre es obligatorio.                  |
      | Viaje a Cartagena | 0       | El costo estimado debe ser mayor a 0.      |

  Escenario: Registrar un aporte
    Dado que tengo la meta "Viaje a Cartagena" de $3.000.000
    Cuando registro un aporte de $300.000
    Entonces la meta muestra 10% de avance

  Escenario: Aporte con monto inválido
    Dado que tengo una meta
    Cuando registro un aporte sin monto
    Entonces veo el error "Ingresa un monto válido."

  Escenario: Acciones de la meta
    Dado que tengo una meta
    Cuando agrego la acción "Comparar tiquetes"
    Y la marco como hecha
    Entonces la acción aparece completada

  Escenario: Pausar y completar una meta
    Dado que tengo una meta activa
    Cuando la pauso
    Entonces su estado es "pausada"
    Cuando la marco como completada
    Entonces su estado es "completada"

  Escenario: Editar una meta
    Dado que tengo la meta "Viaje a Cartagena"
    Cuando cambio el costo a $3.500.000 y pulso "Guardar cambios"
    Entonces el avance se recalcula con el nuevo costo
