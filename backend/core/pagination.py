from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Extends PageNumberPagination to respect PAGE_SIZE_QUERY_PARAM and MAX_PAGE_SIZE
    from REST_FRAMEWORK settings (the built-in class ignores them by default).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
