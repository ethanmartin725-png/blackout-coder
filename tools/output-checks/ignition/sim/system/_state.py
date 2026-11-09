# Shared state for one lesson run: the clock, the tag provider and the database connection.
from java.util import Date


class NotModeled(Exception):
    """The lesson used part of Ignition this teaching model does not cover."""


class Clock(object):
    def __init__(self):
        self.ms = None

    def now(self):
        if self.ms is None:
            raise NotModeled("the scenario did not set the clock")
        return Date(self.ms)


clock = Clock()
tags = {}          # full path "[default]Folder/Tag" -> [value, quality, Date]
db_url = [None]    # JDBC URL of the lesson database
default_db = ["PlantDB"]
