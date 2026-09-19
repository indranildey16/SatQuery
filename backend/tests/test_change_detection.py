import pytest
import io
import os
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.change_detection_service import change_detection_service, ChangeAnalysisError
from app.services.query_router import route_query, RouteResult, UnsupportedTaskError


def create_test_image(color=(100, 100, 100), size=(100, 100)):
    buf = io.BytesIO()
    img = Image.new('RGB', size, color=color)
    img.save(buf, format='JPEG')
    buf.seek(0)
    return buf


def test_same_image_zero_change(tmp_path):
    img_path = str(tmp_path / 'img.jpg')
    Image.new('RGB', (120, 120), color=(150, 150, 150)).save(img_path)

    res = change_detection_service.run_change_detection(img_path, img_path)
    assert res['statistics']['changedPixelCount'] == 0
    assert res['statistics']['changePercentage'] == 0.0
    assert res['statistics']['changedRegionCount'] == 0
    assert len(res['regions']) == 0
    assert '0 spatially distinct changed regions' in res['summary']


def test_different_image_non_zero_change(tmp_path):
    path_b = str(tmp_path / 'before.jpg')
    path_a = str(tmp_path / 'after.jpg')

    img_b = Image.new('RGB', (200, 200), color=(50, 50, 50))
    img_a = Image.new('RGB', (200, 200), color=(50, 50, 50))
    
    # Add a 40x40 patch in image A
    a_arr = np.array(img_a)
    a_arr[20:60, 20:60] = [220, 220, 220]
    Image.fromarray(a_arr).save(path_a)
    img_b.save(path_b)

    res = change_detection_service.run_change_detection(path_b, path_a, threshold=30.0, min_area_pixels=20)
    assert res['statistics']['changedPixelCount'] > 0
    assert res['statistics']['changePercentage'] > 0.0
    assert res['statistics']['changedRegionCount'] >= 1
    assert len(res['regions']) >= 1
    first_r = res['regions'][0]
    assert first_r['pixelArea'] >= 1000
    assert len(first_r['bbox']) == 4
    assert len(first_r['centroid']) == 2


def test_different_dimensions_resampling(tmp_path):
    path_b = str(tmp_path / 'before_100.jpg')
    path_a = str(tmp_path / 'after_150.jpg')

    Image.new('RGB', (100, 100), color=(100, 100, 100)).save(path_b)
    Image.new('RGB', (150, 120), color=(200, 200, 200)).save(path_a)

    res = change_detection_service.run_change_detection(path_b, path_a)
    assert res['alignment']['method'] == 'bilinear_dimension_resample'
    assert res['alignment']['workingDimensions'] == [100, 100]


def test_missing_and_invalid_inputs(tmp_path):
    with pytest.raises(ChangeAnalysisError) as exc_b:
        change_detection_service.validate_change_inputs(str(tmp_path / 'nonexistent.jpg'), str(tmp_path / 'also_nonexistent.jpg'))
    assert exc_b.value.code == 'MISSING_BEFORE_IMAGE'

    valid_img = str(tmp_path / 'valid.jpg')
    Image.new('RGB', (50, 50), color=(10, 10, 10)).save(valid_img)

    with pytest.raises(ChangeAnalysisError) as exc_a:
        change_detection_service.validate_change_inputs(valid_img, str(tmp_path / 'nonexistent.jpg'))
    assert exc_a.value.code == 'MISSING_AFTER_IMAGE'

    invalid_ext = str(tmp_path / 'file.txt')
    with open(invalid_ext, 'w') as f:
        f.write('not an image')

    with pytest.raises(ChangeAnalysisError) as exc_inv:
        change_detection_service.validate_change_inputs(valid_img, invalid_ext)
    assert exc_inv.value.code == 'INVALID_IMAGE'


def test_noise_filtering_and_min_area(tmp_path):
    path_b = str(tmp_path / 'before_noise.jpg')
    path_a = str(tmp_path / 'after_noise.jpg')

    arr_b = np.full((100, 100, 3), 100, dtype=np.uint8)
    arr_a = arr_b.copy()
    # Add a tiny 2x2 noise spot (< 30 pixels)
    arr_a[10:12, 10:12] = 255
    # Add a large 25x25 change zone (625 pixels)
    arr_a[40:65, 40:65] = 255

    Image.fromarray(arr_b).save(path_b)
    Image.fromarray(arr_a).save(path_a)

    res = change_detection_service.run_change_detection(path_b, path_a, min_area_pixels=30)
    # The tiny 2x2 spot is removed by morphological opening or min_area filter
    assert res['statistics']['changedRegionCount'] == 1
    assert res['regions'][0]['pixelArea'] >= 500


def test_visualizations_data_urls(tmp_path):
    path_b = str(tmp_path / 'b.jpg')
    path_a = str(tmp_path / 'a.jpg')
    Image.new('RGB', (80, 80), color=(50, 50, 50)).save(path_b)
    Image.new('RGB', (80, 80), color=(200, 200, 200)).save(path_a)

    res = change_detection_service.run_change_detection(path_b, path_a)
    assert res['visualizations']['maskDataUrl'].startswith('data:image/png;base64,')
    assert res['visualizations']['overlayDataUrl'].startswith('data:image/jpeg;base64,')


def test_change_query_routing():
    res1 = route_query('What areas have changed between these two images?', requested_task='auto')
    assert res1.task == 'change_analysis'
    assert res1.model == 'classical-change-baseline'

    res2 = route_query('Show the major changed regions.', requested_task='auto')
    assert res2.task == 'change_analysis'

    res3 = route_query('Identify dock infrastructure', requested_task='change_analysis')
    assert res3.task == 'change_analysis'

    res4 = route_query('Describe scene', requested_task='auto', has_bitemporal_inputs=True)
    assert res4.task == 'change_analysis'


def test_api_change_analysis_flow(client: TestClient):
    img_b = create_test_image(color=(50, 50, 50), size=(100, 100))
    img_a = create_test_image(color=(180, 180, 180), size=(100, 100))

    resp = client.post(
        '/api/v1/analyses',
        files={
            'image_before': ('before.jpg', img_b, 'image/jpeg'),
            'image_after': ('after.jpg', img_a, 'image/jpeg')
        },
        data={
            'query': 'What areas have changed between these two images?',
            'task': 'change_analysis',
            'modality': 'auto'
        }
    )
    assert resp.status_code == 201
    analysis_id = resp.json()['analysis_id']

    # Fetch analysis detail
    detail = client.get(f'/api/v1/analyses/{analysis_id}')
    assert detail.status_code == 200
    data = detail.json()
    assert data['analysis_id'] == analysis_id
    assert data['status'] in ['queued', 'processing', 'completed']
