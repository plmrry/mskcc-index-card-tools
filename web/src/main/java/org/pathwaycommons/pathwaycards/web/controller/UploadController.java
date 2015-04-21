package org.pathwaycommons.pathwaycards.web.controller;

import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.FileUploadException;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.pathwaycommons.pathwaycards.web.service.OncosignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;

@Controller
@RequestMapping("/upload")
public class UploadController
{
	@Autowired
	OncosignService oncosignService;

	public OncosignService getOncosignService()
	{
		return oncosignService;
	}

	public void setOncosignService(OncosignService oncosignService)
	{
		this.oncosignService = oncosignService;
	}

	@RequestMapping(value = "file/",
	                method = {RequestMethod.POST},
	                headers = "Accept=multipart/form-data")
	public ResponseEntity<String> uploadFile(HttpServletRequest request,
			HttpServletResponse response)
	{
		HttpHeaders headers = new HttpHeaders();

		try
		{
			List<FileItem> items =
				new ServletFileUpload(new DiskFileItemFactory()).parseRequest(request);

			Iterator<FileItem> iter = items.iterator();

			String result = "NA";

			// process each file and write contents to outputDir
			while (iter.hasNext())
			{
				FileItem item = iter.next();
				String fieldName = item.getFieldName();

				if (item.getSize() == 0)
				{
					return new ResponseEntity<String>("Empty file.", headers, HttpStatus.BAD_REQUEST);
				}

				InputStream contentStream = item.getInputStream();

				try {
					this.getOncosignService().copyFileContent(contentStream, fieldName);
				} catch (Exception e) {
					return new ResponseEntity<String>(e.getMessage(), headers, HttpStatus.BAD_REQUEST);
				}
			}

			try {
				result = this.getOncosignService().executeSea();
			} catch (Exception e) {
				return new ResponseEntity<String>(e.getMessage(), headers, HttpStatus.BAD_REQUEST);
			}

			return new ResponseEntity<String>(result, headers, HttpStatus.OK);
		}
		catch (IOException e)
		{
			return new ResponseEntity<String>("IO error.", headers, HttpStatus.BAD_REQUEST);
		}
		catch (FileUploadException e)
		{
			return new ResponseEntity<String>("File upload error.", headers, HttpStatus.BAD_REQUEST);
		}
	}
}
