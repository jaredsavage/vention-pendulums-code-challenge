# Time of impact

Because of the system limitation in update frequency, our window where two pendulums could collide is actually pretty large.

We could estimate where an impact would occur within that window by extrapolating from the change in the last frames we've received. With that, we could locally treat it as an impact, despite not having the exact measurement. Wouldn't be perfect, but would greatly increase accuracy in avoiding collisions.

Much cheaper than trying to push for higher frequency updates between machines.
