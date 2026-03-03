from rest_framework.exceptions import APIException


class ParseError(APIException):
    status_code = 400
    default_detail = 'Failed to parse spell data.'
    default_code = 'parse_error'


class ValidationError(APIException):
    status_code = 400
    default_detail = 'Validation failed.'
    default_code = 'validation_error'
