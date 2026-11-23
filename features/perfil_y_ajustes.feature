# language: es
Característica: Perfil y ajustes
  Como usuario
  Quiero gestionar mi perfil y mi cuenta
  Para personalizar la app y controlar mis datos

  Antecedentes:
    Dado que inicié sesión

  Escenario: Editar el perfil
    Cuando abro "Editar Perfil"
    Y cambio mi nombre a "Ana María"
    Y guardo
    Entonces veo "Ana María" en Ajustes

  Escenario: Perfil sin nombre
    Cuando dejo el nombre vacío y guardo
    Entonces veo el error "El nombre es obligatorio."

  Escenario: Cambiar el tema
    Cuando elijo el tema oscuro
    Entonces la app se ve en modo oscuro
    Y la preferencia se conserva al reabrir la app

  Escenario: Eliminar la cuenta
    Cuando pulso "Eliminar cuenta"
    Entonces veo la advertencia de que se borrarán todos mis datos y no se puede deshacer
    Cuando confirmo
    Entonces se eliminan mi cuenta y todos mis datos
    Y vuelvo a la pantalla de inicio

  Escenario: Cancelar la eliminación de la cuenta
    Cuando pulso "Eliminar cuenta" y cancelo
    Entonces mi cuenta sigue activa
